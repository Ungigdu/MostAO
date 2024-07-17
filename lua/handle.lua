local json = require("json")
local profiles = {}

Handlers.add(
    "ProfileUpdate",
    Handlers.utils.hasMatchingTag("Action", "ProfileUpdate"),
    function(msg)
        local data = json.decode(msg.Data)

        print("ao.env.Process.Owner: " .. ao.env.Process.Owner)
        -- if ao.env.Process.Owner ~= msg.From then
        --     print('Unauthorized attempt to update profile')
        --     Handlers.utils.reply(json.encode({ status = "error", message = "Unauthorized" ,owner = ao.env.Process.Owner, msgFrom = msg.From}))(msg)
        --     return
        -- end

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

