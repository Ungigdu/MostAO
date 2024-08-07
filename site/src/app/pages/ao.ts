import { Web3Provider } from '@ethersproject/providers'
import { connect } from '@permaweb/aoconnect'
import { DataItem } from 'arseeding-arbundles'
import { createData } from 'arseeding-arbundles'
import { InjectedEthereumSigner } from 'arseeding-arbundles/src/signing'
import isString from 'lodash/isString'
import { type Tag } from 'arweave/web/lib/transaction'

const defaultAOConfig = {
  CU_URL: 'https://cu.ao-testnet.xyz',
  MU_URL: 'https://mu.ao-testnet.xyz',
  GATEWAY_URL: 'https://g8way.io:443'
}

/**
 * Find the value for a tag name
 */
export const getTagValue = (tagName: string, tags: Tag[]) =>
  tags.find((t) => t.name === tagName)?.value

export interface Message {
  Anchor: string;
  Tags: Tag[];
  Target: string;
  Data: string;
}

/**
 * Get balance for address
 * @param id ID of the token
 * @param address Target address
 */
export async function getAOTokenBalance(
  id: string,
  address: string
): Promise<number> {
  const ao = connect(defaultAOConfig)
  const timeoutPromise = new Promise<number>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000)
  )

  const fetchBalance = async () => {
    const res = await ao.dryrun({
      Id: '0000000000000000000000000000000000000000001',
      Owner: address,
      process: id,
      tags: [{ name: 'Action', value: 'Balance' }]
    })

    for (const msg of res.Messages as Message[]) {
      const balance = getTagValue('Balance', msg.Tags)

      if (balance) return parseInt(balance)
    }

    return 0
  }

  try {
    return await Promise.race([fetchBalance(), timeoutPromise])
  } catch (error) {
    console.error(error)
    return 0
  }
}

export const checkArPermissions = async (permissions: string[] | string): Promise<void> => {
  let existingPermissions: string[] = []
  permissions = isString(permissions) ? [permissions] : permissions

  try {
    existingPermissions = await window.arweaveWallet.getPermissions()
  } catch {
    throw new Error('PLEASE_INSTALL_ARCONNECT')
  }

  if (permissions.length === 0) {
    return
  }

  if (permissions.some(permission => {
    return !existingPermissions.includes(permission)
  })) {
    await window.arweaveWallet.connect(permissions as never[])
  }
}

export const transferAoToken = async (
  chainType: string,
  process: string,
  amount: string,
  recipient: string
) => {
  const ao = connect(defaultAOConfig)

  try {
    let createDataItemSigner = () => {}
    if (chainType === 'arweave') {
      createDataItemSigner = () => async ({
        data,
        tags = [],
        target,
        anchor
      }: {
          data: any
          tags?: { name: string; value: string }[]
          target?: string
          anchor?: string
        }): Promise<{ id: string; raw: ArrayBuffer }> => {
        await checkArPermissions([
          'ACCESS_ADDRESS',
          'ACCESS_ALL_ADDRESSES',
          'ACCESS_PUBLIC_KEY',
          'SIGN_TRANSACTION',
          'SIGNATURE'
        ])

        const signed = await window.arweaveWallet.signDataItem({
          data,
          tags,
          anchor,
          target
        })
        const dataItem = new DataItem(Buffer.from(signed))

        return {
          id: await dataItem.id,
          raw: await dataItem.getRaw()
        }
      }
    } else {
      createDataItemSigner =() => async ({
        data,
        tags = [],
        target,
        anchor
      }: {
            data: any;
            tags?: { name: string; value: string }[];
            target?: string;
            anchor?: string;
          }): Promise<{ id: string; raw: ArrayBuffer }> => {
        const provider = new Web3Provider((window as any).ethereum)
        const signer = new InjectedEthereumSigner(provider )
        await signer.setPublicKey()
        const dataItem = createData(data, signer, { tags, target, anchor })

        await dataItem.sign(signer)

        return {
          id: dataItem.id,
          raw: dataItem.getRaw()
        }
      }
    }
    const signer = createDataItemSigner() as any
    const transferID = await ao.message({
      process,
      signer,
      tags: [
        { name: 'Action', value: 'Transfer' },
        { name: 'Quantity', value: amount },
        { name: 'Recipient', value: recipient }
      ]
    })
    return transferID
  } catch (err) {
    console.log('err', err)
    throw err
  }
}