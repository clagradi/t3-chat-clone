import React from 'react'
import CodeBlock from './CodeBlock'

const MessageRenderer = ({ text }) => {
  // Simple regex to detect code blocks
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  const inlineCodeRegex = /`([^`]+)`/g
  
  let lastIndex = 0
  const elements = []
  let match

  // Reset regex lastIndex
  codeBlockRegex.lastIndex = 0

  // Process code blocks
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index)
      elements.push(
        <span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ 
          __html: beforeText.replace(inlineCodeRegex, '<code class="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        }} />
      )
    }
    
    // Add code block
    const language = match[1] || 'text'
    const code = match[2].trim()
    elements.push(
      <CodeBlock key={`code-${match.index}`} code={code} language={language} />
    )
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    elements.push(
      <span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ 
        __html: remainingText.replace(inlineCodeRegex, '<code class="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      }} />
    )
  }
  
  // If no code blocks found, just handle inline code
  if (elements.length === 0) {
    return (
      <div dangerouslySetInnerHTML={{ 
        __html: text.replace(inlineCodeRegex, '<code class="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      }} />
    )
  }
  
  return <div className="prose prose-sm max-w-none">{elements}</div>
}

export default MessageRenderer

