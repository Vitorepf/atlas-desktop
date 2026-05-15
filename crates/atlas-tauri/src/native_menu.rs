use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Runtime,
};

const ITEM_SURFACE_CARTOGRAFIA: &str = "atlas.surface.cartografia";
const ITEM_SURFACE_CODE: &str = "atlas.surface.code";
const ITEM_SETTINGS_OPEN_CODE_TERMINAL: &str = "atlas.settings.open_code_terminal";
const ITEM_SETTINGS_TERMINAL_RIGHT: &str = "atlas.settings.terminal_right";
const ITEM_SETTINGS_TERMINAL_BOTTOM: &str = "atlas.settings.terminal_bottom";
const ITEM_SETTINGS_RESET_TERMINAL_LAYOUT: &str = "atlas.settings.reset_terminal_layout";
const ITEM_TERMINAL_TOGGLE: &str = "atlas.terminal.toggle";
const ITEM_TERMINAL_NEW_SESSION: &str = "atlas.terminal.new_session";
const ITEM_TERMINAL_CLOSE_SESSION: &str = "atlas.terminal.close_session";
const ITEM_TERMINAL_SEARCH: &str = "atlas.terminal.search";
const ITEM_TERMINAL_CLEAR: &str = "atlas.terminal.clear";
const ITEM_TERMINAL_INTERRUPT: &str = "atlas.terminal.interrupt";
const ITEM_TERMINAL_TOGGLE_PLACEMENT: &str = "atlas.terminal.toggle_placement";
const ITEM_TERMINAL_TOGGLE_MAXIMIZE: &str = "atlas.terminal.toggle_maximize";
const ITEM_TERMINAL_HIDE_DOCK: &str = "atlas.terminal.hide_dock";

pub fn atlas_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let menu = Menu::default(app)?;

    let settings = Submenu::with_id_and_items(
        app,
        "atlas.settings",
        "Configurações",
        true,
        &[
            &MenuItem::with_id(
                app,
                ITEM_SETTINGS_OPEN_CODE_TERMINAL,
                "Abrir Code com Terminal",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                ITEM_SETTINGS_TERMINAL_RIGHT,
                "Terminal na Direita",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                ITEM_SETTINGS_TERMINAL_BOTTOM,
                "Terminal no Rodapé",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                ITEM_SETTINGS_RESET_TERMINAL_LAYOUT,
                "Restaurar Layout do Terminal",
                true,
                None::<&str>,
            )?,
        ],
    )?;

    let atlas = Submenu::with_id_and_items(
        app,
        "atlas.workspace",
        "Atlas",
        true,
        &[
            &MenuItem::with_id(
                app,
                ITEM_SURFACE_CARTOGRAFIA,
                "Abrir Cartografia",
                true,
                Some("CmdOrCtrl+1"),
            )?,
            &MenuItem::with_id(
                app,
                ITEM_SURFACE_CODE,
                "Abrir Code",
                true,
                Some("CmdOrCtrl+2"),
            )?,
        ],
    )?;

    let terminal = Submenu::with_id_and_items(
        app,
        "atlas.terminal",
        "Terminal",
        true,
        &[
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_TOGGLE,
                "Mostrar/Ocultar Terminal",
                true,
                Some("CmdOrCtrl+J"),
            )?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_NEW_SESSION,
                "Nova Sessão",
                true,
                Some("CmdOrCtrl+T"),
            )?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_CLOSE_SESSION,
                "Fechar Sessão Ativa",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_SEARCH,
                "Buscar no Terminal",
                true,
                Some("CmdOrCtrl+F"),
            )?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_CLEAR,
                "Limpar Terminal Ativo",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_INTERRUPT,
                "Interromper Processo",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_TOGGLE_PLACEMENT,
                "Alternar Dock Direita/Rodapé",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_TOGGLE_MAXIMIZE,
                "Maximizar/Restaurar Terminal",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                ITEM_TERMINAL_HIDE_DOCK,
                "Fechar Dock do Terminal",
                true,
                None::<&str>,
            )?,
        ],
    )?;

    // Default macOS menu order is App, File, Edit, View, Window, Help.
    // Insert Configurações before File and keep Atlas controls before Window.
    menu.insert(&settings, 1)?;
    menu.insert(&atlas, 5)?;
    menu.insert(&terminal, 6)?;

    Ok(menu)
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    let event_name = match event.id().as_ref() {
        ITEM_SURFACE_CARTOGRAFIA => "atlas-menu:surface-cartografia",
        ITEM_SURFACE_CODE => "atlas-menu:surface-code",
        ITEM_SETTINGS_OPEN_CODE_TERMINAL => "atlas-menu:settings-open-code-terminal",
        ITEM_SETTINGS_TERMINAL_RIGHT => "atlas-menu:settings-terminal-right",
        ITEM_SETTINGS_TERMINAL_BOTTOM => "atlas-menu:settings-terminal-bottom",
        ITEM_SETTINGS_RESET_TERMINAL_LAYOUT => "atlas-menu:settings-reset-terminal-layout",
        ITEM_TERMINAL_TOGGLE => "atlas-menu:terminal-toggle",
        ITEM_TERMINAL_NEW_SESSION => "atlas-menu:terminal-new-session",
        ITEM_TERMINAL_CLOSE_SESSION => "atlas-menu:terminal-close-session",
        ITEM_TERMINAL_SEARCH => "atlas-menu:terminal-search",
        ITEM_TERMINAL_CLEAR => "atlas-menu:terminal-clear",
        ITEM_TERMINAL_INTERRUPT => "atlas-menu:terminal-interrupt",
        ITEM_TERMINAL_TOGGLE_PLACEMENT => "atlas-menu:terminal-toggle-placement",
        ITEM_TERMINAL_TOGGLE_MAXIMIZE => "atlas-menu:terminal-toggle-maximize",
        ITEM_TERMINAL_HIDE_DOCK => "atlas-menu:terminal-hide-dock",
        _ => return,
    };

    let _ = app.emit(event_name, ());
}
