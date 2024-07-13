# MostAO

Messages and other stuff transmitted by AO

## Background

AO, the computer, is a promising new infrastructure that enables Web3 applications to deliver a Web2 experience. To enhance the AO ecosystem, a protocol is required to establish a standardized messaging system for processes to communicate.

## Conceptes

- Avatar: processes living on AO who serves as the agents of users. A user will chat and do other stuffs via an avatar
- Handle: A handle is the unique identifier of an avatar
- Session: A session is process establish between two avatars. A session is responsible for keeping the message history and key exchange
- Router: spawn and keep records of all sessions 

## Handle Registry

Every process in MOSTAO has a (social)handle as its unique identifier. The handle records are managed by a handle registry process. The activities of the registry process is as follows:

### QueryHandle(name)

Returns the process id which is currently the owner and pid of this handle.

```lua
dryrun({
  Target = "{Registry Process ID}",
  Data = "{name}",
  Tags = {
    Action = "QueryHandle"
  }
})
```

### GetHandles(owner)

Return the handles under this owner (wallet address)

```lua
dryrun({
  Target = "{Registry Process ID}",
  Data = "{owner}",
  Tags = {
    Action = "GetHandles"
  }
})
```

### Register(name, pid)

Register a handle name, with PID as the avatar user and an owner who can reassign this handle.

```lua
send({
  Target = "{Handle Process ID}",
  Data = {
   name = "{name}",
   pid = "{pid}"
  },
  Tags = {
    Action = "Register"
  }
})
```

### Renounce(Name)

Renounce a handle, set it free. Can only be called by current owner

```lua
send({
  Target = "{Registry Process ID}",
  Data = {
   name = "{name}"
  },
  Tags = {
    Action = "Renounce"
  }
})
```

## Avatar

An avatar is a spawned process that act as an agent for a user. An avatar should bind to a handle for the users in this protocol to find each other.
An avatar has those functions:
1. keep a profile along with env variables
2. keep records of session ids between this avatar and others (avatar or g)
