import fs from 'fs'

let content = fs.readFileSync('src/admin/crud.js', 'utf8')

// We need to replace all COALESCE usage in PUT routes with the new read-modify-write pattern.
// 1. In every PUT route, after the body is read, we get the existing row.
// 2. We do `const up = { ...existing[0], ...body }`.
// 3. We remove COALESCE and just use `up.column`

content = content.replace(/adminApp\.put\('([^']+)', async \(c\) => \{([\s\S]*?)const rows = await sql`\s*UPDATE ([^\s]+) SET\s*([\s\S]*?)WHERE id = \$\{id\}\s*RETURNING \*\s*`([\s\S]*?)\}\)/g, 
(match, route, setup, table, setBlocks, teardown) => {
  // Extract existing fetch if it's there
  if (setup.includes('SELECT * FROM')) {
     // it's already fetching, we just need to adapt
  }

  // Create the new set blocks by replacing COALESCE(${body.X}, Y) with ${up.X}
  const cleanSetBlocks = setBlocks.replace(/([a-z_]+)\s*=\s*COALESCE\(\$\{body\.([^\}]+)\},\s*[^\)]+\)/g, (m, col, prop) => {
    return `${col} = \$\{up.${prop}\}`
  })
  
  // also handle JSON.stringify for JSONB columns which currently look like:
  // platforms = COALESCE(${body.platforms ? JSON.stringify(body.platforms) : null}, platforms)
  const evenCleanerSetBlocks = cleanSetBlocks.replace(/([a-z_]+)\s*=\s*COALESCE\(\$\{body\.([^\?]+)\s*\?\s*JSON\.stringify\(body\.([^\)]+)\)\s*:\s*null\},\s*[^\)]+\)/g, (m, col, prop1, prop2) => {
    return `${col} = \$\{up.${prop1} ? JSON.stringify(up.${prop1}) : null\}`
  })

  return `adminApp.put('${route}', async (c) => {${setup}const existing = await sql\`SELECT * FROM ${table} WHERE id = \$\{id\}\`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql\`
    UPDATE ${table} SET
${evenCleanerSetBlocks}WHERE id = \$\{id\}
    RETURNING *
  \`${teardown.replace(/await logAudit\(sql, c\.get\('user'\)\.sub, 'UPDATE', '[^']+', id, null, rows\[0\]\)/g, `await logAudit(sql, c.get('user').sub, 'UPDATE', '${table}', id, e, rows[0])` )}})`
})

fs.writeFileSync('src/admin/crud.js', content)
console.log("Updated crud.js")
