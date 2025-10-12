// requirementsTracker.ts - Helper functions for requirements tracking with Markdown files

/**
 * Identifies if a file is a requirements file based on naming convention or content
 * @param fileName - The name of the file to check
 * @param content - The content of the file to check
 * @returns boolean indicating if this is a requirements file
 */
export function isRequirementsFile(fileName: string, content?: string): boolean {
  // Check filename for requirements indicators
  const reqFilePattern = /^REQ-|requirements|spec|requirement/i;
  if (reqFilePattern.test(fileName)) {
    return true;
  }

  // Check content for requirements sections
  if (content) {
    const reqContentPattern = /(#\s*Requirements|#需求|#\s*規格|##\s*Requirements|##需求|##\s*規格|需求項目|功能需求|非功能需求|requirement.*?:|req-|requirement.*\d\.\d|功能需求規格|系統需求|需求定義|需求規格書|Requirements\s+Specification|Functional\s+Requirements|Non-Functional\s+Requirements)/im;
    return reqContentPattern.test(content);
  }

  return false;
}

/**
 * Extracts requirements from Markdown content
 * @param content - The Markdown content to parse
 * @returns Array of requirements found in the content
 */
export function extractRequirements(content: string): Array<{id: string, title: string, description: string, status: string}> {
  const requirements: Array<{id: string, title: string, description: string, status: string}> = [];

  // Look for requirements in various formats
  // Pattern 1: REQ-ID: Title - Description
  const matches1 = [...content.matchAll(/(REQ-\d+):\s*(.*?)\s*-\s*(.*?)(?=\n\n|Requirements|$)/g)];
  for (const match of matches1) {
    requirements.push({
      id: match[1],
      title: match[2].trim(),
      description: match[3].trim(),
      status: 'pending' // default status
    });
  }

  // Pattern 2: Headers followed by requirement content
  const matches2 = [...content.matchAll(/###\s*(REQ-\d+):\s*(.*?)(?=\n###\s*REQ-|$)/gs)];
  for (const match of matches2) {
    const reqId = match[1];
    const title = match[2].trim();
    const reqContent = match[0];

    // Extract description (content after the header)
    const description = reqContent.substring(match[0].indexOf(title) + title.length)
      .replace(/^(REQ-\d+):\s*/, '')
      .replace(/^\s*-\s*/, '') // Remove leading list items
      .trim();

    requirements.push({
      id: reqId,
      title,
      description,
      status: 'pending' // default status
    });
  }

  // Pattern 3: List items with REQ-ID
  const matches3 = [...content.matchAll(/-\s*(REQ-\d+):\s*(.*?)(?=\n-\s*REQ-|\n\n|$)/gs)];
  for (const match of matches3) {
    requirements.push({
      id: match[1],
      title: match[2].trim(),
      description: match[2].trim(),
      status: 'pending' // default status
    });
  }

  // Pattern 4: Alternative format - REQ-### Title: Description
  const matches4 = [...content.matchAll(/(REQ-\d+)\s+(.*?):\s*(.*?)(?=\n\n|Requirements|$)/g)];
  for (const match of matches4) {
    requirements.push({
      id: match[1],
      title: match[2].trim(),
      description: match[3].trim(),
      status: 'pending' // default status
    });
  }

  // Pattern 5: Numbered requirements (e.g., 1. REQ-###: Title - Description)
  const matches5 = [...content.matchAll(/\d+\.\s*(REQ-\d+):\s*(.*?)\s*-\s*(.*?)(?=\n\d+\.|\n\n|$)/g)];
  for (const match of matches5) {
    requirements.push({
      id: match[1],
      title: match[2].trim(),
      description: match[3].trim(),
      status: 'pending' // default status
    });
  }

  // Pattern 6: Bold requirements format **REQ-###: Title** - Description
  const matches6 = [...content.matchAll(/\*\*(REQ-\d+):\s*(.*?)\*\*\s*-\s*(.*?)(?=\n\*\*REQ-|\n\n|$)/g)];
  for (const match of matches6) {
    requirements.push({
      id: match[1],
      title: match[2].trim(),
      description: match[3].trim(),
      status: 'pending' // default status
    });
  }

  return requirements;
}

/**
 * Updates requirement status in content
 * @param content - Original Markdown content
 * @param reqId - The requirement ID to update
 * @param status - The new status for the requirement
 * @returns Updated content with requirement status changed
 */
export function updateRequirementStatus(content: string, reqId: string, status: string): string {
  // Pattern to find the requirement and update its status
  // This looks for requirements with status indicators
  const statusPattern = new RegExp(`(${reqId}[^\\n]*?)(status:|狀態:|\\[\\s*\\w+\\s*\\]|\\([\\s*\\w+\\s*\\])?)`, 'gi');

  if (statusPattern.test(content)) {
    // If status already exists, update it
    return content.replace(statusPattern, `$1status: ${status}`);
  } else {
    // If no status exists, add it to the requirement
    const reqPattern = new RegExp(`(${reqId}[^\\n]*)`, 'i');
    return content.replace(reqPattern, `$1 [${status}]`);
  }
}

/**
 * Creates a template for a new requirements file
 * @param fileName - The name of the requirements file
 * @returns Template content for a new requirements file
 */
export function createRequirementsTemplate(fileName: string): string {
  const now = new Date().toISOString().split('T')[0];

  return `# Requirements Document: ${fileName.replace('.md', '').replace('REQ-', 'REQ-')}

## Document Information
- Created: ${now}
- Status: Draft
- Version: 1.0

## Overview
This document outlines the requirements for the ${fileName.replace('.md', '').replace('REQ-', '')}.

## Requirements List

### Functional Requirements

### Non-Functional Requirements

### Status Legend
- **Draft**: Initial requirement, not reviewed
- **Review**: Under review
- **Approved**: Approved and ready for implementation
- **Implemented**: Completed and implemented
- **Rejected**: Not approved for implementation

## Change Log
- ${now}: Initial document created
`;
}

/**
 * Gets requirement status from content
 * @param content - Markdown content to scan
 * @param reqId - Requirement ID to check
 * @returns Status of the requirement or null if not found
 */
export function getRequirementStatus(content: string, reqId: string): string | null {
  const statusPattern = new RegExp(`${reqId}[^\\n]*?(status:|狀態:|\\[\\s*(\\w+)\\s*\\]|\\(\\s*(\\w+)\\s*\\))[^\\n]*`, 'i');
  const match = content.match(statusPattern);

  if (match) {
    // Try to extract status from different formats
    const statusMatch = match[0].match(/status:\s*(\w+)|狀態:\s*(\w+)|\[\s*(\w+)\s*\]|\(\s*(\w+)\s*\)/i);
    if (statusMatch) {
      return statusMatch[1] || statusMatch[2] || statusMatch[3] || statusMatch[4] || 'unknown';
    }
  }

  return null;
}