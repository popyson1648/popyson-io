import { parse as parseToml } from "smol-toml";

/**
 * @typedef {Object} MetadataConfig
 * @property {{ default_count?: number, max_tag_chars?: number, max_total_tags?: number, prompt_file?: string, provider?: string, model?: string }} [tag_generation]
 * @property {{ prompt_file?: string, max_chars?: number, provider?: string, model?: string }} [summary_generation]
 * @property {{ default_path?: string }} [thumbnail]
 * @property {{ provider?: string, model?: string, size?: string, quality?: string, prompt_file?: string, concept_prompt_file?: string }} [thumbnail_generation]
 */

/**
 * @param {string} source
 * @returns {MetadataConfig}
 */
export function parseMetadataConfig(source) {
  return /** @type {MetadataConfig} */ (parseToml(source));
}
