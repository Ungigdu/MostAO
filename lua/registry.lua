local json = require("json")
local sqlite3 = require("lsqlite3")
local SQLITE_WASM64_MODULE = "u1Ju_X8jiuq4rX9Nh-ZGRQuYQZgV2MKLMT3CZsykk54"
PROCESS_POOL_THRESHOLD = 10
HANDLE_POOL_NAME = "HandlePool"
SESSION_POOL_NAME = "SessionPool"
INITIAL_PROCESS_COUNT = 20
local HANDLE_LUA_CODE_TEMPLATE = [=[
local json = require("json")
local profiles = {}
PUBKEY = "__PUBKEY__"
HANDLE_OWNER = "__HANDLE_OWNER__"
HANDLE_NAME = "__HANDLE_NAME__"
REGISTRY_PROCESS_ID = "__REGISTRY_PROCESS_ID__"
local sqlite3 = require("lsqlite3")
DB = DB or sqlite3.open_memory()

DB:exec [[
  CREATE TABLE IF NOT EXISTS chatList (
    sessionID TEXT PRIMARY KEY,
    otherHandleName TEXT NOT NULL,
    otherHandleID TEXT NOT NULL,
    lastMessageTime INTEGER,
    lastViewedTime INTEGER
  );
]]
local function authorizeAndReply(msg, expected, errorMessage, reply)
    if msg.From ~= expected then
        print(errorMessage)
        reply(json.encode({
            status = "error",
            message = "Unauthorized"
        }))(msg)
        return false
    end
    return true
end

Handlers.add(
    "ProfileUpdate",
    Handlers.utils.hasMatchingTag("Action", "ProfileUpdate"),
    function(msg)
        local data = json.decode(msg.Data)

        if string.lower(msg.From) ~= HANDLE_OWNER then
            print('Unauthorized attempt to update profile')
            Handlers.utils.reply(json.encode({
                status = "error",
                message = "Unauthorized",
                owner = HANDLE_OWNER,
                msgFrom = msg.From
            }))(msg)
            return
        end

        profiles = {
            name = data.name,
            img = data.img,
            banner = data.banner,
            bio = data.bio,
            pubkey = data.pubkey,
        }

        print('ProfileUpdate Done!')
        Handlers.utils.reply(json.encode({ status = "success" }))(msg)
    end
)

Handlers.add(
    "GetProfile",
    Handlers.utils.hasMatchingTag("Action", "GetProfile"),
    function(msg)
        local completeProfile = profiles
        completeProfile.pubkey = PUBKEY
        Handlers.utils.reply(json.encode(completeProfile))(msg)
    end
)

Handlers.add(
    "RelayMessage",
    Handlers.utils.hasMatchingTag("Action", "RelayMessage"),
    function(msg)
        local wrappedMessage = json.decode(msg.Data)

        -- if not authorizeAndReply(msg, HANDLE_OWNER, 'Unauthorized attempt to relay message', Handlers.utils.reply) then
        --    return
        -- end

        if not wrappedMessage.Target or not wrappedMessage.Data or not wrappedMessage.Tags then
            print('Invalid WrappedMessage format')
            Handlers.utils.reply(json.encode({
                status = "error",
                message = "Invalid WrappedMessage format"
            }))(msg)
            return
        end

        ao.send({
            Target = wrappedMessage.Target,
            Data = wrappedMessage.Data,
            Tags = wrappedMessage.Tags
        })

        print('Message relayed to target process')
        Handlers.utils.reply(json.encode({ status = "success" }))(msg)
    end
)

Handlers.add(
    "UpdateChatList",
    Handlers.utils.hasMatchingTag("Action", "UpdateChatList"),
    function(msg)
        local data = json.decode(msg.Data)

        if not authorizeAndReply(msg, REGISTRY_PROCESS_ID, 'Unauthorized attempt to update chat list', Handlers.utils.reply) then
            return
        end

        local stmt = DB:prepare [[
          REPLACE INTO chatList (sessionID, otherHandleName, otherHandleID) VALUES (:sessionID, :otherHandleName, :otherHandleID);
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            sessionID = data.sessionID,
            otherHandleName = data.otherHandleName,
            otherHandleID = data.otherHandleID,
            -- lastMessageTime = data.lastMessageTime,
            -- lastViewedTime = data.lastViewedTime
        })

        stmt:step()
        stmt:reset()

        print('Chat list updated with new session: ' .. data.sessionID)
        Handlers.utils.reply(json.encode({ status = "success" }))(msg)
    end
)


Handlers.add(
    "GetChatList",
    Handlers.utils.hasMatchingTag("Action", "GetChatList"),
    function(msg)
        -- if not authorizeAndReply(msg, ao.env.Process.Tags["MostAO-Handle-Owner"], 'Unauthorized attempt to get chat list', Handlers.utils.reply) then
        --    return
        -- end

        local stmt = DB:prepare [[
          SELECT sessionID, otherHandleName, otherHandleID, lastMessageTime, lastViewedTime FROM chatList;
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        local chatList = {}
        for row in stmt:nrows() do
            table.insert(chatList, row)
        end

        stmt:reset()
        print('ChatList: ' .. json.encode(chatList))
        Handlers.utils.reply(json.encode(chatList))(msg)
        print('Chat list sent to owner')
    end
)

Handlers.add(
    "Notify",
    Handlers.utils.hasMatchingTag("Action", "Notify"),
    function(msg)
        local data = json.decode(msg.Data)
        local stmt = DB:prepare [[
          UPDATE chatList SET lastMessageTime = :lastMessageTime WHERE sessionID = :sessionID;
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            lastMessageTime = data.lastMessageTime,
            sessionID = msg.From
        })

        stmt:step()
        stmt:reset()

        Handlers.utils.reply(json.encode({ status = "success", message = "Notification received" }))(msg)
    end
)
]=]
local SESSION_LUA_CODE_TEMPLATE = [=[
local json = require("json")
local sqlite3 = require("lsqlite3")
HANDLE_A_NAME = "__HANDLE_A_NAME__"
HANDLE_A_PROCESS = "__HANDLE_A_PROCESS__"
HANDLE_B_NAME = "__HANDLE_B_NAME__"
HANDLE_B_PROCESS = "__HANDLE_B_PROCESS__"

DB = DB or sqlite3.open_memory()

DB:exec [[
  CREATE TABLE IF NOT EXISTS session_keys (
    generation INTEGER PRIMARY KEY AUTOINCREMENT,
    encrypted_sk_by_a TEXT,
    pubkey_a TEXT,
    encrypted_sk_by_b TEXT,
    pubkey_b TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    generation INTEGER,
    timestamp INTEGER,
    content TEXT
  );
]]

local function authorizeAndReply(msg, expected, errorMessage, reply)
    if msg.From ~= expected then
        print(errorMessage)
        reply(json.encode({
            status = "error",
            message = "Unauthorized"
        }))(msg)
        return false
    end
    return true
end

local function query(stmt)
    local rows = {}
    for row in stmt:nrows() do
        table.insert(rows, row)
    end
    stmt:reset()
    return rows
end

Handlers.add(
    "RotateSessionKey",
    Handlers.utils.hasMatchingTag("Action", "RotateSessionKey"),
    function(msg)
        local data = json.decode(msg.Data)

        if not (authorizeAndReply(msg, HANDLE_A_PROCESS, 'Unauthorized attempt to rotate session key', Handlers.utils.reply) or
                authorizeAndReply(msg, HANDLE_B_PROCESS, 'Unauthorized attempt to rotate session key', Handlers.utils.reply)) then
            return
        end

        local stmt = DB:prepare [[
          INSERT INTO session_keys (encrypted_sk_by_a, pubkey_a, encrypted_sk_by_b, pubkey_b)
          VALUES (:encrypted_sk_by_a, :pubkey_a, :encrypted_sk_by_b, :pubkey_b);
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            encrypted_sk_by_a = data.encrypted_sk_by_a,
            pubkey_a = data.pubkey_a,
            encrypted_sk_by_b = data.encrypted_sk_by_b,
            pubkey_b = data.pubkey_b
        })

        stmt:step()
        stmt:reset()

        Handlers.utils.reply(json.encode({ status = "success", message = "Session key rotated" }))(msg)
    end
)

Handlers.add(
    "GetCurrentKeys",
    Handlers.utils.hasMatchingTag("Action", "GetCurrentKeys"),
    function(msg)
        local stmt = DB:prepare [[
      SELECT * FROM session_keys ORDER BY generation DESC LIMIT 1;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        local rows = query(stmt)
        Handlers.utils.reply(json.encode(rows))(msg)
    end
)

Handlers.add(
    "GetKeyByGeneration",
    Handlers.utils.hasMatchingTag("Action", "GetKeyByGeneration"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
      SELECT * FROM session_keys WHERE generation = :generation;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({ generation = data.generation })
        local rows = query(stmt)
        Handlers.utils.reply(json.encode(rows))(msg)
    end
)

Handlers.add(
    "SendMessage",
    Handlers.utils.hasMatchingTag("Action", "SendMessage"),
    function(msg)
        local data = json.decode(msg.Data)

        if not (authorizeAndReply(msg, HANDLE_A_PROCESS, 'Unauthorized attempt to send message', Handlers.utils.reply) or
                authorizeAndReply(msg, HANDLE_B_PROCESS, 'Unauthorized attempt to send message', Handlers.utils.reply)) then
            return
        end

        local stmt = DB:prepare [[
          INSERT INTO messages (sender, generation, timestamp, content)
          VALUES (:sender, :generation, :timestamp, :content);
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            sender = msg.From,
            generation = data.generation,
            timestamp = msg.Timestamp / 1000,
            content = data.content
        })

        stmt:step()
        stmt:reset()

        ao.send({
            Target = HANDLE_A_PROCESS,
            Action = "Notify",
            Data = json.encode({ lastMessageTime = msg.Timestamp / 1000 })
        })

        ao.send({
            Target = HANDLE_B_PROCESS,
            Action = "Notify",
            Data = json.encode({ lastMessageTime = msg.Timestamp / 1000 })
        })

        Handlers.utils.reply(json.encode({ status = "success", message = "Message sent and notification sent" }))(msg)
    end
)

Handlers.add(
    "QueryMessage",
    Handlers.utils.hasMatchingTag("Action", "QueryMessage"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt
        if data.order == "ASC" then
            stmt = DB:prepare [[
      SELECT * FROM messages WHERE timestamp BETWEEN :start_time AND :end_time
      ORDER BY timestamp ASC LIMIT :limit;
    ]]
        else
            stmt = DB:prepare [[
        SELECT * FROM messages WHERE timestamp BETWEEN :start_time AND :end_time
        ORDER BY timestamp DESC LIMIT :limit;
    ]]
        end

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            start_time = data["from"],
            end_time = data["until"],
            limit = data.limit
        })

        local rows = query(stmt)
        Handlers.utils.reply(json.encode(rows))(msg)
    end
)

]=]
DB = DB or sqlite3.open_memory()

DB:exec [[
  CREATE TABLE IF NOT EXISTS handles (
    handle TEXT PRIMARY KEY,
    pid TEXT NOT NULL,
    owner TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    handleA TEXT NOT NULL,
    handleB TEXT NOT NULL,
    FOREIGN KEY (handleA) REFERENCES handles(handle),
    FOREIGN KEY (handleB) REFERENCES handles(handle)
  );

  CREATE TABLE IF NOT EXISTS process_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id TEXT NOT NULL,
    pool_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS groups (
    group_id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    created_at INTEGER
  );
]]

local function query(stmt)
    local rows = {}
    for row in stmt:nrows() do
        table.insert(rows, row)
    end
    stmt:reset()
    return rows
end

local function authorizeAndReply(msg, expected, errorMessage, reply)
    if string.lower(msg.From) ~= expected then
        print(errorMessage)
        reply(json.encode({
            status = "error",
            message = "Unauthorized"
        }))(msg)
        return false
    end
    return true
end

local function checkAndRefillPool(pool_name)
    local countStmt = DB:prepare [[
        SELECT COUNT(*) as count FROM process_pool WHERE pool_name = :pool_name;
    ]]
    countStmt:bind_names({ pool_name = pool_name })
    local countRows = query(countStmt)
    local count = countRows[1].count

    print('Pool ' .. pool_name .. ' count: ' .. count)
    local needed = PROCESS_POOL_THRESHOLD - count
    if needed > 0 then
        for i = 1, needed do
            local spawnMessage = {
                Tags = {
                    { name = "Name", value = pool_name == HANDLE_POOL_NAME and "MostAO-Handle" or "MostAO-Session" }
                }
            }
            ao.spawn(SQLITE_WASM64_MODULE, spawnMessage)
        end
    end
end

local function getProcessFromPool(poolName)
    local stmt = DB:prepare [[
        SELECT process_id FROM process_pool WHERE pool_name = :pool_name LIMIT 1;
    ]]
    stmt:bind_names({ pool_name = poolName })
    local rows = query(stmt)

    if #rows > 0 then
        local process_id = rows[1].process_id
        local deleteStmt = DB:prepare [[
            DELETE FROM process_pool WHERE process_id = :process_id;
        ]]
        deleteStmt:bind_names({ process_id = process_id })
        deleteStmt:step()
        deleteStmt:reset()

        return process_id
    else
        return nil
    end
end

local function initializeProcessPools()
    checkAndRefillPool(HANDLE_POOL_NAME)
    checkAndRefillPool(SESSION_POOL_NAME)
end

initializeProcessPools()

Handlers.add(
    "QueryHandle",
    Handlers.utils.hasMatchingTag("Action", "QueryHandle"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
            SELECT pid, owner FROM handles WHERE handle = :handle;
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            handle = data.handle
        })

        local rows = query(stmt)

        if #rows == 0 then
            print('Handle not registered: ' .. data.handle)
            Handlers.utils.reply(json.encode({
                status = "success",
                handle = data.handle,
                registered = false
            }))(msg)
        else
            print('QueryHandle: ' .. data.handle)
            print('PID: ' .. rows[1].pid)
            print('Owner: ' .. rows[1].owner)
            Handlers.utils.reply(json.encode({
                status = "success",
                handle = data.handle,
                registered = true,
                pid = rows[1].pid,
                owner = rows[1].owner
            }))(msg)
        end
        print('QueryHandle Done!')
    end
)

Handlers.add(
    "GetHandles",
    Handlers.utils.hasMatchingTag("Action", "GetHandles"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
      SELECT handle, pid FROM handles WHERE owner = :owner;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            owner = data.owner
        })

        local rows = query(stmt)
        print('Getting handles for: ' .. data.owner)
        print('result: ' .. json.encode(rows))
        Handlers.utils.reply(json.encode(rows))(msg)
        print('GetHandles Done!')
    end
)

Handlers.add(
    "Register",
    Handlers.utils.hasMatchingTag("Action", "Register"),
    function(msg)
        local data = json.decode(msg.Data)

        local checkStmt = DB:prepare [[
            SELECT pid FROM handles WHERE handle = :handle;
        ]]

        if not checkStmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        checkStmt:bind_names({ handle = data.handle })
        local rows = query(checkStmt)
        checkStmt:reset()

        if #rows > 0 then
            Handlers.utils.reply(json.encode({ status = "error", message = "Handle already exists" }))(msg)
            return
        end

        local process_id = getProcessFromPool(HANDLE_POOL_NAME)

        if not process_id then
            Handlers.utils.reply(json.encode({ status = "error", message = "No available process in handle pool" }))(msg)
            return
        end

        -- Convert msg.From string to lower characters
        local owner = string.lower(msg.From)

        print('Registering handle: ' .. data.handle)
        print('Owner: ' .. owner)

        ao.send({
            Target = process_id,
            Action = "Eval",
            Data = HANDLE_LUA_CODE_TEMPLATE:gsub("__PUBKEY__", data.pubkey)
                :gsub("__HANDLE_NAME__", data.handle)
                :gsub("__HANDLE_OWNER__", owner)
                :gsub("__REGISTRY_PROCESS_ID__", ao.id)
        })

        local stmt = DB:prepare [[
            REPLACE INTO handles (handle, pid, owner) VALUES (:handle, :pid, :owner);
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            handle = data.handle,
            pid = process_id,
            owner = owner
        })

        stmt:step()
        stmt:reset()

        print('Handle code injected for ' .. data.handle)
        Handlers.utils.reply("Handle registration success")(msg)

        checkAndRefillPool(HANDLE_POOL_NAME)
    end
)

Handlers.add(
    "Spawned",
    Handlers.utils.hasMatchingTag("Action", "Spawned"),
    function(msg)
        local process_id = msg.Tags.Process
        local pool_name = msg.Tags.Name == "MostAO-Handle" and HANDLE_POOL_NAME or SESSION_POOL_NAME

        local stmt = DB:prepare [[
            INSERT INTO process_pool (process_id, pool_name) VALUES (:process_id, :pool_name);
        ]]
        stmt:bind_names({ process_id = process_id, pool_name = pool_name })
        stmt:step()
        stmt:reset()

        Handlers.utils.reply("Process added to pool")(msg)
    end
)

Handlers.add(
    "Renounce",
    Handlers.utils.hasMatchingTag("Action", "Renounce"),
    function(msg)
        local data = json.decode(msg.Data)

        local checkStmt = DB:prepare [[
      SELECT owner FROM handles WHERE handle = :handle;
    ]]

        if not checkStmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        checkStmt:bind_names({ handle = data.handle })
        local rows = query(checkStmt)

        if #rows == 0 or rows[1].owner ~= string.lower(msg.From) then
            Handlers.utils.reply(json.encode({ status = "error", message = "Unauthorized" }))(msg)
            print('Renounce Unauthorized')
            return
        end

        local stmt = DB:prepare [[
      DELETE FROM handles WHERE handle = :handle AND owner = :owner;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            handle = data.handle,
            owner = data.owner
        })

        stmt:step()
        stmt:reset()
        print('Renounce Done!')
        Handlers.utils.reply(json.encode({ status = "success" }))(msg)
    end
)

Handlers.add(
    "QuerySession",
    Handlers.utils.hasMatchingTag("Action", "QuerySession"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
          SELECT session_id FROM sessions WHERE (handleA = :handleA AND handleB = :handleB) OR (handleA = :handleB AND handleB = :handleA);
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            handleA = data.handleA,
            handleB = data.handleB
        })

        local rows = query(stmt)

        if #rows == 0 then
            Handlers.utils.reply(json.encode({ status = "error", message = "No session found" }))(msg)
            print('No session found between ' .. data.handleA .. ' and ' .. data.handleB)
        else
            Handlers.utils.reply(json.encode({ status = "success", sessionID = rows[1].session_id }))(msg)
            print('Session found between ' .. data.handleA .. ' and ' .. data.handleB)
        end
    end
)

Handlers.add(
    "EstablishSession",
    Handlers.utils.hasMatchingTag("Action", "EstablishSession"),
    function(msg)
        local data = json.decode(msg.Data)
        local handleA = data.handleA
        local handleB = data.handleB

        print("Handle A: " .. handleA)
        print("Handle B: " .. handleB)

        local stmtA = DB:prepare [[
          SELECT pid, owner FROM handles WHERE handle = :handleA;
        ]]
        local stmtB = DB:prepare [[
          SELECT pid, owner FROM handles WHERE handle = :handleB;
        ]]

        if not stmtA or not stmtB then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmtA:bind_names({ handleA = handleA })
        stmtB:bind_names({ handleB = handleB })

        local rowsA = query(stmtA)
        local rowsB = query(stmtB)

        if #rowsA == 0 or #rowsB == 0 then
            Handlers.utils.reply(json.encode({ status = "error", message = "Handle not found" }))(msg)
            print(rowsA)
            print(rowsB)
            print('One or both handles not found in registry')
            return
        end

        local processA = rowsA[1].pid
        local ownerA = rowsA[1].owner
        local processB = rowsB[1].pid
        local ownerB = rowsB[1].owner
        if not authorizeAndReply(msg, ownerA, 'Unauthorized attempt to establish session for handleA', Handlers.utils.reply) and
            not authorizeAndReply(msg, ownerB, 'Unauthorized attempt to establish session for handleB', Handlers.utils.reply) then
            return
        end

        local queryStmt = DB:prepare [[
          SELECT session_id FROM sessions WHERE (handleA = :handleA AND handleB = :handleB) OR (handleA = :handleB AND handleB = :handleA);
        ]]

        if not queryStmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        queryStmt:bind_names({
            handleA = handleA,
            handleB = handleB
        })

        local existingSession = query(queryStmt)

        if #existingSession > 0 then
            Handlers.utils.reply(json.encode({ status = "success", sessionID = existingSession[1].session_id }))(msg)
            print('Session already exists between ' ..
                handleA .. ' and ' .. handleB .. ': ' .. existingSession[1].session_id)
            return
        end

        local process_id = getProcessFromPool(SESSION_POOL_NAME)
        if not process_id then
            Handlers.utils.reply(json.encode({ status = "error", message = "No available process in session pool" }))(
                msg)
            return
        end

        ao.send({
            Target = process_id,
            Action = "Eval",
            Data = SESSION_LUA_CODE_TEMPLATE:gsub("__HANDLE_A_NAME__", handleA):gsub("__HANDLE_A_PROCESS__",
                processA):gsub("__HANDLE_B_NAME__", handleB):gsub("__HANDLE_B_PROCESS__", processB)
        })

        local stmt = DB:prepare [[
            INSERT INTO sessions (session_id, handleA, handleB) VALUES (:session_id, :handleA, :handleB);
        ]]
        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            session_id = process_id,
            handleA = handleA,
            handleB = handleB
        })

        stmt:step()
        stmt:reset()

        print('Session registered between ' .. handleA .. ' and ' .. handleB .. ': ' .. process_id)

        ao.send({
            Target = processA,
            Action = "UpdateChatList",
            Data = json.encode({
                sessionID = process_id,
                otherHandleName = handleB,
                otherHandleID = processB,
            })
        })

        ao.send({
            Target = processB,
            Action = "UpdateChatList",
            Data = json.encode({
                sessionID = process_id,
                otherHandleName = handleA,
                otherHandleID = processA,
            })
        })

        checkAndRefillPool(SESSION_POOL_NAME)
        Handlers.utils.reply("Session Establish Success")(msg)
    end
)

-- ------------------
-- Testing for group

Handlers.add(
    "SpawnGroup",
    Handlers.utils.hasMatchingTag("Action", "SpawnGroup"),
    function(msg)
        local data = json.decode(msg.Data)

        -- get a process that already created before.
        local process_id = getProcessFromPool(HANDLE_POOL_NAME)

        if not process_id then
            Handlers.utils.reply(json.encode({ status = "error", message = "No available process in the pool." }))(msg)
            return
        end

        -- Convert msg.From string to lower characters
        local owner = string.lower(msg.From)

        print('Group Owner: ' .. owner)

        ao.send({
            Target = process_id,
            Action = "Eval",
            Data = GROUP_LUA_CODE:gsub("__PUBKEY__", data.pubkey)
                :gsub("__GROUP_OWNER__", owner)
                :gsub("__REGISTRY_PROCESS_ID__", ao.id)
        })

        local stmt = DB:prepare [[
            REPLACE INTO groups (group_id, owner, created_at) VALUES (:group_id, :owner, :created_at);
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            group_id = process_id,
            owner = owner,
            created_at = os.time()
        })

        stmt:step()
        stmt:reset()

        print('Group spawn success')
        Handlers.utils.reply("Group spawn success")(msg)

        checkAndRefillPool(HANDLE_POOL_NAME)
    end
)
