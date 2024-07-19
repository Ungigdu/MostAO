local json = require("json")
local sqlite3 = require("lsqlite3")
local SQLITE_WASM64_MODULE = "u1Ju_X8jiuq4rX9Nh-ZGRQuYQZgV2MKLMT3CZsykk54"
local HANDLE_LUA_CODE = [=[
local json = require("json")
local profiles = {}
REGISTRY_PROCESS_ID = "oH5zaOmPCdCL_N2Mn79qqwtoCLXS2y6gcXv7Ohfmh-k"
local sqlite3 = require("lsqlite3")
DB = DB or sqlite3.open_memory()

DB:exec [[
  CREATE TABLE IF NOT EXISTS chatList (
    sessionID TEXT PRIMARY KEY,
    otherHandle TEXT NOT NULL,
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

        if ao.env.Process.Tags["MostAO-Handle-Owner"] ~= msg.From then
            print('Unauthorized attempt to update profile')
            Handlers.utils.reply(json.encode({
                status = "error",
                message = "Unauthorized",
                owner = ao.env.Process.Tags["MostAO-Handle-Owner"],
                msgFrom =
                    msg.From
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
        Handlers.utils.reply(json.encode(profiles))(msg)
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
          REPLACE INTO chatList (sessionID, otherHandle) VALUES (:sessionID, :otherHandle);
        ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_names({
            sessionID = data.sessionID,
            otherHandle = data.otherHandle
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
        --     return
        -- end

        local stmt = DB:prepare [[
          SELECT sessionID, otherHandle, lastMessageTime, lastViewedTime FROM chatList;
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
        print('QueryHandle: ' .. data.handle)
        print('PID: ' .. rows[1].pid)
        print('Owner: ' .. rows[1].owner)
        Handlers.utils.reply(json.encode(rows))(msg)
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

        print('Registering handle: ' .. data.handle)
        -- print('PID: ' .. data.pid)
        print('Owner: ' .. msg.From)
        local spawnMessage = {
            Tags = {
                { name = "MostAO-Handle-Name",  value = data.handle },
                { name = "MostAO-Handle-Owner", value = msg.From },
                { name = "Name",                value = "MostAO-Handle" }
            }
        }
        local result = ao.spawn(SQLITE_WASM64_MODULE, spawnMessage)
    end
)

Handlers.add(
    "Spawned",
    Handlers.utils.hasMatchingTag("Action", "Spawned"),
    function(msg)
        local pid = msg.Tags.Process
        local owner = msg.Tags["MostAO-Handle-Owner"]
        local handle = msg.Tags["MostAO-Handle-Name"]

        print('Spawned Done!')

        if handle then
            local stmt = DB:prepare [[
              REPLACE INTO handles (handle, pid, owner) VALUES (:handle, :pid, :owner);
            ]]

            if not stmt then
                error("Failed to prepare SQL statement: " .. DB:errmsg())
            end

            stmt:bind_names({
                handle = handle,
                pid = pid,
                owner = owner
            })
            local result = ao.send({
                Target = pid,
                Action = "Eval",
                Data = HANDLE_LUA_CODE
            })
            print("result: " .. json.encode(result))
            stmt:step()
            stmt:reset()
            Handlers.utils.reply("Handle Spawn Success")(msg)
        else
            local handleA_name = msg.Tags["Session-HandleA-Name"]
            local handleA_pid = msg.Tags["Session-HandleA-Process"]
            local handleB_name = msg.Tags["Session-HandleB-Name"]
            local handleB_pid = msg.Tags["Session-HandleB-Process"]

            local stmt = DB:prepare [[
              INSERT INTO sessions (session_id, handleA, handleB) VALUES (:session_id, :handleA, :handleB);
            ]]

            if not stmt then
                error("Failed to prepare SQL statement: " .. DB:errmsg())
            end

            stmt:bind_names({
                session_id = pid,
                handleA = handleA_name,
                handleB = handleB_name
            })
            stmt:step()
            stmt:reset()
            print('Session registered between ' .. handleA_name .. ' and ' .. handleB_name .. ': ' .. pid)
            local transferedData = json.encode({
                session_id = pid,
                otherHandle = handleB_name,
            })
            print('Transfering data to ' .. handleA_pid .. ': ' .. transferedData)
            ao.send({
                Target = handleA_pid,
                Action = "UpdateChatList",
                Data = json.encode({
                    sessionID = pid,
                    otherHandle = handleB_name,
                    -- lastMessageTime = os.time(),
                    -- lastViewedTime =
                    --     os.time()
                })
            })

            ao.send({
                Target = handleB_pid,
                Action = "UpdateChatList",
                Data = json.encode({
                    sessionID = pid,
                    otherHandle = handleA_name,
                    -- lastMessageTime = os.time(),
                    -- lastViewedTime =
                    --     os.time()
                })
            })
            Handlers.utils.reply("Session Spawn Success")(msg)
        end
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

        if #rows == 0 or rows[1].owner ~= msg.From then
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

        if not authorizeAndReply(msg, ownerA, 'Unauthorized attempt to establish session for handleA', Handlers.utils.reply) then
            return
        end

        if not authorizeAndReply(msg, ownerB, 'Unauthorized attempt to establish session for handleB', Handlers.utils.reply) then
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

        local spawnMessage = {
            Tags = {
                { name = "Session-HandleA-Name",    value = handleA },
                { name = "Session-HandleA-Process", value = processA },
                { name = "Session-HandleB-Name",    value = handleB },
                { name = "Session-HandleB-Process", value = processB },
                { name = "Name",                    value = "MostAO-Session" }
            }
        }
        local result = ao.spawn(SQLITE_WASM64_MODULE, spawnMessage)
        print('Spawn session request sent for handles ' .. handleA .. ' and ' .. handleB)
        Handlers.utils.reply(json.encode({ status = "success", message = "Session spawn request sent, " }))(msg)
    end
)
