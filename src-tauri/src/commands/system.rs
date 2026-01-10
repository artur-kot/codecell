use font_kit::source::SystemSource;
use std::collections::HashSet;

/// Get list of monospace font families installed on the system
#[tauri::command]
pub fn get_system_fonts() -> Vec<String> {
    let source = SystemSource::new();
    let mut font_names: HashSet<String> = HashSet::new();

    // Get all font families
    if let Ok(families) = source.all_families() {
        for family in families {
            // Filter to likely monospace fonts by name
            let lower = family.to_lowercase();
            if lower.contains("mono")
                || lower.contains("code")
                || lower.contains("consol")
                || lower.contains("courier")
                || lower.contains("fixed")
                || lower.contains("terminal")
                || lower.contains("menlo")
                || lower.contains("source code")
                || lower.contains("fira")
                || lower.contains("hack")
                || lower.contains("inconsolata")
                || lower.contains("iosevka")
                || lower.contains("jetbrains")
                || lower.contains("cascadia")
                || lower.contains("sf mono")
                || lower.contains("ubuntu mono")
                || lower.contains("roboto mono")
                || lower.contains("droid sans mono")
                || lower.contains("liberation mono")
                || lower.contains("dejavu sans mono")
                || lower.contains("noto mono")
                || lower.contains("anonymous")
                || lower.contains("ibm plex mono")
                || lower.contains("victor mono")
                || lower.contains("space mono")
                || lower.contains("overpass mono")
            {
                font_names.insert(family);
            }
        }
    }

    let mut fonts: Vec<String> = font_names.into_iter().collect();
    fonts.sort();
    fonts
}
