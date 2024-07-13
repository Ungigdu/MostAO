local json = require("json")
local sqlite3 = require("lsqlite3")

DB = DB or sqlite3.open_memory()

DB:exec [[
  CREATE TABLE IF NOT EXISTS domains (
    domain TEXT PRIMARY KEY,
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
    "QueryDomain",
    Handlers.utils.hasMatchingTag("Action", "QueryDomain"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
      SELECT pid, owner FROM domains WHERE domain = :domain;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_domains({
            domain = data.domain
        })

        local rows = query(stmt)
        Handlers.utils.reply(json.encode(rows))(msg)
        print('QueryDomain Done!')
    end
)

Handlers.add(
    "GetDomains",
    Handlers.utils.hasMatchingTag("Action", "GetDomains"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
      SELECT domain FROM domains WHERE owner = :owner;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_domains({
            owner = data.owner
        })

        local rows = query(stmt)
        Handlers.utils.reply(json.encode(rows))(msg)
        print('GetDomains Done!')
    end
)

Handlers.add(
    "Register",
    Handlers.utils.hasMatchingTag("Action", "Register"),
    function(msg)
        local data = json.decode(msg.Data)

        local stmt = DB:prepare [[
      REPLACE INTO domains (domain, pid, owner) VALUES (:domain, :pid, :owner);
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_domains({
            domain = data.domain,
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
      SELECT owner FROM domains WHERE domain = :domain;
    ]]

        if not checkStmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        checkStmt:bind_domains({ domain = data.domain })
        local rows = query(checkStmt)

        if #rows == 0 or rows[1].owner ~= msg.From then
            Handlers.utils.reply(json.encode({ status = "error", message = "Unauthorized" }))(msg)
            print('Renounce Unauthorized')
            return
        end

        local stmt = DB:prepare [[
      DELETE FROM domains WHERE domain = :domain AND owner = :owner;
    ]]

        if not stmt then
            error("Failed to prepare SQL statement: " .. DB:errmsg())
        end

        stmt:bind_domains({
            domain = data.domain,
            owner = data.owner
        })

        stmt:step()
        stmt:reset()
        print('Renounce Done!')
        Handlers.utils.reply(json.encode({ status = "success" }))(msg)
    end
)
