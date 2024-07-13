# MostAO

Messages and other stuff transmitted by AO

## Background

AO, the computer, is a promising new infrastructure that enables Web3 applications to deliver a Web2 experience. To enhance the AO ecosystem, a protocol is required to establish a standardized messaging framework for AO processes to communicate.

## MIP-01 Domain

Every process in MOTAO has a domain name as its unique identifier. The domain records are managed by a domain process. The protocol for the domain process is as follows:

- QueryDomain(name)

Returns the process id which is currently the owner and pid of this domain. 

```
dryrun({
		Target = "{Domain Process ID}",
		Data = "{name}"
		Tags = {
				Action = "QueryDomain",
		}
})
```

- GetDomains(owner)

Return the Domain names under this owner

```
dryrun({
		Target = "{Domain Process ID}",
		Data = "{owner}"
		Tags = {
				Action = "GetDomains",
		}
})
```

- Upsert(name, pid, owner)

Register a domain name, which PID as the current domain user and an owner who can reassign this domain.

```
send({
		Target = "{Domain Process ID}",
		Data = {
			name = "{name}",
			pid = "{pid}"
		}
		Tags = {
				Action = "Upsert"
		}
})
```

- Renounce(Name)

Renounce the domain, set it free. Can only be called by current owner

```
send({
		Target = "{Domain Process ID}",
		Data = {
			name = "{name}",
		}
		Tags = {
				Action = "Renounce"
		}
})
```