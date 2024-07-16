local json = require("json")
local sqlite3 = require("lsqlite3")

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

        stmt:bind_handles({
            handle = data.handle
        })

        local rows = query(stmt)
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
      SELECT handle FROM handles WHERE owner = :owner;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_handles({
            owner = data.owner
        })

        local rows = query(stmt)
        Handlers.utils.reply(json.encode(rows))(msg)
        print('GetHandles Done!')
    end
)

Handlers.add(
    "Register",
    Handlers.utils.hasMatchingTag("Action", "Register"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
      REPLACE INTO handles (handle, pid, owner) VALUES (:handle, :pid, :owner);
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_handles({
            handle = data.handle,
            pid = data.pid,
            owner = msg.From
        })

        stmt:step()
        stmt:reset()
        print('Register Done!')
        Handlers.utils.reply(json.encode({ status = "success" }))(msg)
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

        checkStmt:bind_handles({ handle = data.handle })
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

        stmt:bind_handles({
            handle = data.handle,
            owner = data.owner
        })

        stmt:step()
        stmt:reset()
        print('Renounce Done!')
        Handlers.utils.reply(json.encode({ status = "success" }))(msg)
    end
)
