local json = require("json")
local sqlite3 = require("lsqlite3")
local SQLITE_WASM64_MODULE = "u1Ju_X8jiuq4rX9Nh-ZGRQuYQZgV2MKLMT3CZsykk54"
local HANDLE_LUA_CODE = [[
local json = require("json")
local profiles = {}

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
]]
DB = DB or sqlite3.open_memory()

DB:exec [[
  CREATE TABLE IF NOT EXISTS handles (
    handle TEXT PRIMARY KEY,
    pid TEXT NOT NULL,
    owner TEXT NOT NULL
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
