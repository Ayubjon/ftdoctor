// Structural and role-sequence validation for a single chat training example.
// Returns a flat list of issues; an empty list means the example is clean.
//
// Each issue: { code, severity: 'error'|'warning', message, messageIndex? }

import { contentToText } from './tokens.js';

// Roles accepted across OpenAI and Anthropic chat fine-tuning formats.
export const ALLOWED_ROLES = ['system', 'user', 'assistant', 'tool', 'function', 'developer'];

function hasContent(message) {
  return Object.prototype.hasOwnProperty.call(message, 'content');
}

function isEmptyContent(message) {
  return contentToText(message.content).trim() === '';
}

/**
 * Validate one training example.
 * @param {object} example an object expected to contain a `messages` array
 * @returns {Array<{code:string, severity:string, message:string, messageIndex?:number}>}
 */
export function validateExample(example) {
  const issues = [];

  if (!example || typeof example !== 'object') {
    issues.push({ code: 'NO_MESSAGES', severity: 'error', message: 'Example is not an object' });
    return issues;
  }

  const messages = example.messages;
  if (!Array.isArray(messages)) {
    issues.push({
      code: 'NO_MESSAGES',
      severity: 'error',
      message: 'Missing required "messages" array',
    });
    return issues;
  }

  if (messages.length === 0) {
    issues.push({ code: 'EMPTY_MESSAGES', severity: 'error', message: '"messages" array is empty' });
    return issues;
  }

  let hasAssistant = false;
  let prevRole = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      issues.push({
        code: 'MSG_NOT_OBJECT',
        severity: 'error',
        message: `Message ${i} is not an object`,
        messageIndex: i,
      });
      continue;
    }

    const role = msg.role;
    if (!ALLOWED_ROLES.includes(role)) {
      issues.push({
        code: 'BAD_ROLE',
        severity: 'error',
        message: `Message ${i} has unknown role "${role}"`,
        messageIndex: i,
      });
    } else {
      if (role === 'assistant') hasAssistant = true;
      if (role === 'system' && i !== 0) {
        issues.push({
          code: 'SYSTEM_NOT_FIRST',
          severity: 'error',
          message: `System message must be first, found at index ${i}`,
          messageIndex: i,
        });
      }
      if (prevRole === role && (role === 'user' || role === 'assistant')) {
        issues.push({
          code: 'CONSECUTIVE_ROLE',
          severity: 'warning',
          message: `Two consecutive "${role}" messages at index ${i}`,
          messageIndex: i,
        });
      }
      prevRole = role;
    }

    if (!hasContent(msg)) {
      issues.push({
        code: 'MISSING_CONTENT',
        severity: 'error',
        message: `Message ${i} is missing the "content" field`,
        messageIndex: i,
      });
    } else if (isEmptyContent(msg)) {
      if (role === 'assistant') {
        issues.push({
          code: 'EMPTY_ASSISTANT',
          severity: 'error',
          message: `Assistant message ${i} has empty content (nothing to learn from)`,
          messageIndex: i,
        });
      } else {
        issues.push({
          code: 'EMPTY_CONTENT',
          severity: 'warning',
          message: `Message ${i} has empty content`,
          messageIndex: i,
        });
      }
    }
  }

  if (!hasAssistant) {
    issues.push({
      code: 'NO_ASSISTANT',
      severity: 'error',
      message: 'Example has no assistant message (no training target)',
    });
  }

  return issues;
}
