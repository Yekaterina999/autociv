function autociv_initCheck()
{
    let settings = Engine.ReadJSONFile("autociv_data/default_config.json");
    let state = {
        "needsRestart": false,
        "reasons": new Set()
    };
    let configSaveToMemoryAndToDisk = (key, value) =>
    {
        Engine.ConfigDB_CreateValue("user", key, value);
        Engine.ConfigDB_WriteValueToFile("user", key, value, "config/user.cfg");
        state.needsRestart = true;
    }

    // Reorder mods so FGod is always before AutoCiv
    let mods = Engine.ConfigDB_GetValue("user", "mod.enabledmods").trim().split(/\s+/g);
    let iFGod = mods.findIndex(name => /^FGod.*/i.test(name));
    let iAutociv = mods.findIndex(name => /^AutoCiv.*/i.test(name));

    if (iFGod != -1 && iAutociv != -1 && iFGod > iAutociv)
    {
        [mods[iFGod], mods[iAutociv]] = [mods[iAutociv], mods[iFGod]];
        Engine.SetMods(mods);
        configSaveToMemoryAndToDisk("mod.enabledmods", mods.join(" "));
        state.reasons.add("Detected wrong mod order. Fixed. FGod needs to be loaded before AutoCiv.");
    }

    // Reset all autociv settings to default. Custom autociv settings added won't be affected.
    if (Engine.ConfigDB_GetValue("user", "autociv.settings.reset.all") === "true")
    {
        for (let key in settings)
            configSaveToMemoryAndToDisk(key, settings[key]);
        state.reasons.add("AutoCiv settings reseted by user.");
        return state;
    }

    // Normal check. Check for settings entries missing
    for (let key in settings)
        if (Engine.ConfigDB_GetValue("user", key) === "")
        {
            configSaveToMemoryAndToDisk(key, settings[key]);
            state.reasons.add("New AutoCiv settings added.");
        }

    return state;
};

autociv_patchApplyN("init", function (target, that, args)
{
    let state = autociv_initCheck();
    if (state.needsRestart)
    {
        let message = ["0 A.D needs to restart.\n", "Reasons:\n"].
            concat(Array.from(state.reasons).map(v => ` · ${v}`)).
            join("\n");

        messageBox(500, 300, message,
            "AutoCiv mod notice",
            ["Cancel", "Restart"],
            [() => { }, () => Engine.RestartEngine()]
        );

        let hasFgodAutoStartup = Engine.ConfigDB_GetValue("user", "gui.startintolobby") === "true";
        if (hasFgodAutoStartup)
            Engine.ConfigDB_CreateValue("user", "gui.startintolobby", "false")
        let result = target.apply(that, args);
        if (hasFgodAutoStartup)
            Engine.ConfigDB_CreateValue("user", "gui.startintolobby", "true")

        return result;
    }
    return target.apply(that, args);
})

var g_autociv_hotkeyActions = {
    "autociv.open.autociv_settings": function (ev)
    {
        autocivCL.Engine.PushGuiPage("page_autociv_settings.xml");
    }
    // ,"autociv.open.test": function (ev)
    // {
    //     autocivCL.Engine.PushGuiPage("page_test.xml");
    // }
};

function handleInputBeforeGui(ev)
{
    resizeBar.onEvent(ev);

    if (ev.hotkey && g_autociv_hotkeyActions[ev.hotkey])
        g_autociv_hotkeyActions[ev.hotkey](ev);

    return false;
}
