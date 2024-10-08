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
