use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TemplateType {
    Web,
    Node,
    Python,
    Rust,
    Java,
    Typescript,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebConfig {
    pub markup: String,
    pub styling: String,
    pub script: String,
    pub framework: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectFile {
    pub name: String,
    pub content: String,
    pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub template: TemplateType,
    pub web_config: Option<WebConfig>,
    pub files: Vec<ProjectFile>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing)]
    pub saved_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub id: String,
    pub name: String,
    pub template: TemplateType,
    pub path: String,
    pub updated_at: String,
}
