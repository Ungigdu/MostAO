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
