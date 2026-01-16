use crate::models::{CustomTemplate, Project, RecentProject};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ProjectError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Project not found: {0}")]
    NotFound(String),
}

pub struct ProjectManager {
    data_dir: PathBuf,
    temp_dir: PathBuf,
}

impl ProjectManager {
    pub fn new(data_dir: PathBuf) -> Self {
        let temp_dir = data_dir.join("temp");
        Self { data_dir, temp_dir }
    }

    pub fn init(&self) -> Result<(), ProjectError> {
        fs::create_dir_all(&self.temp_dir)?;
        fs::create_dir_all(self.data_dir.join("projects"))?;
        fs::create_dir_all(self.data_dir.join("templates"))?;
        Ok(())
    }

    pub fn save_temp_project(&self, project: &Project) -> Result<PathBuf, ProjectError> {
        let project_dir = self.temp_dir.join(&project.id);
        fs::create_dir_all(&project_dir)?;

        // Save project metadata
        let meta_path = project_dir.join("meta.json");
        let meta_json = serde_json::to_string_pretty(project)?;
        fs::write(&meta_path, meta_json)?;

        // Save individual files
        for file in &project.files {
            let file_path = project_dir.join(&file.name);
            fs::write(&file_path, &file.content)?;
        }

        Ok(project_dir)
    }

    pub fn load_temp_project(&self, id: &str) -> Result<Project, ProjectError> {
        let meta_path = self.temp_dir.join(id).join("meta.json");
        if !meta_path.exists() {
            return Err(ProjectError::NotFound(id.to_string()));
        }

        let meta_json = fs::read_to_string(&meta_path)?;
        let project: Project = serde_json::from_str(&meta_json)?;
        Ok(project)
    }

    pub fn delete_temp_project(&self, id: &str) -> Result<(), ProjectError> {
        let project_dir = self.temp_dir.join(id);
        if project_dir.exists() {
            fs::remove_dir_all(project_dir)?;
        }
        Ok(())
    }

    pub fn save_project_to_path(&self, project: &Project, path: &str) -> Result<(), ProjectError> {
        let project_json = serde_json::to_string_pretty(project)?;
        fs::write(path, project_json)?;
        Ok(())
    }

    pub fn load_project_from_path(&self, path: &str) -> Result<Project, ProjectError> {
        let project_json = fs::read_to_string(path)?;
        let project: Project = serde_json::from_str(&project_json)?;
        Ok(project)
    }

    pub fn get_recent_projects(&self) -> Result<Vec<RecentProject>, ProjectError> {
        let recent_path = self.data_dir.join("recent.json");
        if !recent_path.exists() {
            return Ok(vec![]);
        }

        let recent_json = fs::read_to_string(&recent_path)?;
        let recent: Vec<RecentProject> = serde_json::from_str(&recent_json)?;
        Ok(recent)
    }

    pub fn add_recent_project(&self, project: RecentProject) -> Result<(), ProjectError> {
        let mut recent = self.get_recent_projects().unwrap_or_default();

        // Remove if already exists
        recent.retain(|p| p.id != project.id);

        // Add to front
        recent.insert(0, project);

        // Keep only last 10
        recent.truncate(10);

        let recent_path = self.data_dir.join("recent.json");
        let recent_json = serde_json::to_string_pretty(&recent)?;
        fs::write(recent_path, recent_json)?;

        Ok(())
    }

    pub fn cleanup_old_temp_projects(&self, max_age_days: u64) -> Result<(), ProjectError> {
        use std::time::{Duration, SystemTime};

        let max_age = Duration::from_secs(max_age_days * 24 * 60 * 60);
        let now = SystemTime::now();

        if let Ok(entries) = fs::read_dir(&self.temp_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(age) = now.duration_since(modified) {
                            if age > max_age {
                                let _ = fs::remove_dir_all(entry.path());
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    // Custom template methods

    pub fn save_custom_template(&self, template: &CustomTemplate) -> Result<(), ProjectError> {
        let templates_dir = self.data_dir.join("templates");
        fs::create_dir_all(&templates_dir)?;

        let template_path = templates_dir.join(format!("{}.json", template.id));
        let template_json = serde_json::to_string_pretty(template)?;
        fs::write(template_path, template_json)?;

        Ok(())
    }

    pub fn get_custom_templates(&self) -> Result<Vec<CustomTemplate>, ProjectError> {
        let templates_dir = self.data_dir.join("templates");
        if !templates_dir.exists() {
            return Ok(vec![]);
        }

        let mut templates = Vec::new();

        if let Ok(entries) = fs::read_dir(&templates_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(template) = serde_json::from_str::<CustomTemplate>(&content) {
                            templates.push(template);
                        }
                    }
                }
            }
        }

        // Sort by creation date (newest first)
        templates.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        Ok(templates)
    }

    pub fn delete_custom_template(&self, id: &str) -> Result<(), ProjectError> {
        let template_path = self.data_dir.join("templates").join(format!("{}.json", id));
        if template_path.exists() {
            fs::remove_file(template_path)?;
        }
        Ok(())
    }
}
