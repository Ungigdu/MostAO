# MostAO

Messages and other stuff transmitted by AO

## Background

AO, the computer, is a promising new infrastructure that enables Web3 applications to deliver a Web2 experience. To enhance the AO ecosystem, a protocol is required to establish a standardized messaging system for processes to communicate.

## Conceptes

- Handle: A handle is the unique identifier, and is also a process that can send and receive messages.
- Session: A session is process establish between two handles. A session is responsible for keeping the message history and key exchange
- Registry: Register all handles and spawns sessions between handles.

## Handle Registry

Every process in MOSTAO has a (social)handle as its unique identifier. The handle records are managed by a handle registry process. The activities of the registry process is as follows:

### QueryHandle(name)

Returns the process id which is currently the owner and pid of this handle.

```ts
dryrun({
  Target = "{Registry Process ID}",
  Data = "{name}",
  Tags = {
    Action = "QueryHandle",
  },
});
```

### GetHandles(owner)

Return the handles under this owner (wallet address)

```ts
dryrun({
  Target = "{Registry Process ID}",
  Data = "{owner}",
  Tags = {
    Action = "GetHandles",
  },
});
```

### Register(name)

Register a handle name, spawn a handle process with this name in it

```ts
send({
  Target = "{Handle Process ID}",
  Data = "{name}",
  Tags = {
    Action = "Register",
  },
});
```

### Renounce(Name)

Renounce a handle, set it free. Can only be called by current owner

```ts
send({
  Target = "{Registry Process ID}",
  Data = {
    name = "{name}",
  },
  Tags = {
    Action = "Renounce",
  },
});
```

### QuerySession(handleA, handleB)

Return session id if there exists a session between handleA and handleB (order does not matter), otherwise return nil.

```ts
dryrun({
  Target = "{Registry Process ID}",
  Data = "{handleA, handleB}",
  Tags = {
    Action = "QuerySession",
  },
});
```

### EstablishSession(handleA, handleB)

This function can only be called by either one of handle owner. It will spawn a session process between the handleA and the handleB. Then notify the two handles to update the chatlist.

```lua
send({
  Target = "{Registry Process ID}",
  Data = "{handleA, handleB}",
  Tags = {
    Action = "EstablishSession"
  }
})
```

## Handle

A handle process acts as an agent for a user. Handle has those functions:

1. keep a profile along with env variables
2. keep chat list
3. send and receive messages

The activities of the handle process is as follows:

### ProfileUpdate(profile)

Update the profile of this handle, the structure of profile data is as follows:

```ts
{
  name: <string>,
  img: <url>, //profile picture,
  banner: <url>,
  bio: <string>,
  pubkey: <string>,
  ...other fields
}
```

```ts
send({
  Target = "{Handle Process ID}",
  Data = "{profile}",
  Tags = {
    Action = "ProfileUpdate",
  },
});
```

### GetProfile()

Retrieve the profile of this handle.

```ts
send({
  Target = "{Handle Process ID}",
  Tags = {
    Action = "GetProfile",
  },
});
```

### RelayMessage(content)

Send encrypted message from user (user's wallet) to handle. (Then the handle will send the content to session process)

```ts
send({
  Target = "{Session Process ID}",
  Data = "{content}",
  Tags = {
    Action = "SendMessage",
  },
});
```

### UpdateChatList(sessionInfo)

This function is called by the Registry process. It updates the chat list of this handle with new session information. Only the Registry process is authorized to call this function.

```lua
send({
  Target = "{Handle Process ID}",
  Data = "{sessionInfo}",
  Tags = {
    Action = "UpdateChatList"
  }
})
```

### GetChatList()

This function is called by the handle owner. It retrieves the chat list of this handle, including all related session information.

```ts
send({
  Target = "{Handle Process ID}",
  Tags = {
    Action = "GetChatList",
  },
});
```

### Notify(data?)

Whenever a handle sends a message to session process, the session process will notify the conterpart of incoming message by sending a notification to it. This can only be called by session process. The data is optional for now.

```lua
send({
  Target = "{Handle Process ID}",
  Data = "{data}",
  Tags = {
    Action = "Notify"
  }
})
```

## Session

A session is a process establish between to processes and it can only be called by those two processes. A session is responsible for session key management, keeping chat history. This is a workflow of encrypted DM between handleA (owned by userA) and handleB (owned by userB):

1. userA generates a session key (SK) in its local environment, outside of AO
2. userA encrypts the SK by its own pubkey and gets SK_EA in its local environment
3. userA encrypts the SK by userB's pubkey and gets SK_EB in its local environment
4. handleA sends SK_EA and SK_EB to session process
5. userA encrypts a messgae using SK, gets MSG_E
6. handleA send MSG_E to session process
7. session process sends a notification to handleB
8. when handleB is online, it checks the SK_EB and MSG_E, using userB's private key, it can decrypt SK then the MSG

The activities of the session process is as follows:

### RotateSessionKey({SK_EA, pubkey_A},{SK_EB, pubkey_B})

Update session key, can be called by either handle. All handles should be kept in an array. The lens of array can be seen as generation number

```lua
send({
  Target = "{Session Process ID}",
  Data = "{SK_EA, pubkey_A},{SK_EB, pubkey_B}",
  Tags = {
    Action = "RotateSessionKey"
  }
})
```

### GetCurrentKeys()

get current session key with key generation

```ts
dryrun({
  Target = "{Session Process ID}",
  Tags = {
    Action = "GetCurrentKey",
  },
});
```

### GetKeyByGeneration(generation)

get key by generation number

```ts
dryrun({
  Target = "{Session Process ID}",
  Data = "generation",
  Tags = {
    Action = "GetKeyByGeneration",
  },
});
```

### SendMessage(content)

Send encrypted message to session process. The session will keep the message's from, pubkey, generation, timestamp with the content.

```ts
send({
  Target = "{Session Process ID}",
  Data = "{content}",
  Tags = {
    Action = "SendMessage",
  },
});
```

### QueryMessage(from, until, limit, order)

Query encrypted messages, with from as start time, until as end time, limit as numbers you want to get and order as asc desc (in time)

```ts
dryrun({
  Target = "{Session Process ID}",
  Data = "{
    from: "{from}",
    until: "{until}",
    limit: "{limit}",
    order: "{order}"
  }",
  Tags = {
    Action = "QueryMessage"
  }
})
```
