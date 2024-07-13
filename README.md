# MostAO

Messages and other stuff transmitted by AO

## Background

AO, the computer, is a promising new infrastructure that enables Web3 applications to deliver a Web2 experience. To enhance the AO ecosystem, a protocol is required to establish a standardized messaging framework for AO processes to communicate.

## MIP-01 Domain

Every process in MOSTAO has a domain name as its unique identifier. The domain records are managed by a domain process. The protocol for the domain process is as follows:

- QueryDomain(name)

Returns the process id which is currently the owner and pid of this domain.

```lua
dryrun({
  Target = "{Domain Process ID}",
  Data = "{name}",
  Tags = {
    Action = "QueryDomain"
  }
})
```

- GetDomains(owner)

Return the Domain names under this owner

```lua
dryrun({
  Target = "{Domain Process ID}",
  Data = "{owner}",
  Tags = {
    Action = "GetDomains"
  }
})
```

- Register(name, pid)

Register a domain name, which PID as the current domain user and an owner who can reassign this domain.

```lua
send({
  Target = "{Domain Process ID}",
  Data = {
   name = "{name}",
   pid = "{pid}"
  },
  Tags = {
    Action = "Register"
  }
})
```

- Renounce(Name)

Renounce the domain, set it free. Can only be called by current owner

```lua
send({
  Target = "{Domain Process ID}",
  Data = {
   name = "{name}"
  },
  Tags = {
    Action = "Renounce"
  }
})
```

## MIP-02 Profile

Each wallet address can be associated with multiple profiles, with each profile managed by a separate process. Each profile includes personal information such as an avatar, nickname, and other details. Additionally, each process contains various related entities, such as an unread message box, a contacts list, and more.

## MIP-03 Chat Session

A Chat Session is established as a process when direct messaging (DM) or group chat operations are conducted between Profile Processes. Each Chat Session Process manages the interactions and data exchange for a specific conversation, ensuring secure and organized communication. The session includes entities such as message history, participant list, and session metadata.

