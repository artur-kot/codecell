mod execution;
mod project;
mod window;

pub use execution::*;
pub use project::*;
pub use window::*;

use crate::services::ProjectManager;
use std::sync::Mutex;

pub struct AppState {
    pub project_manager: Mutex<ProjectManager>,
}
