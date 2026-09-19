export default async function handler(req, res) {
  const NOTION_KEY = process.env.NOTION_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  const headers = {
    'Authorization': `Bearer ${NOTION_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sorts: [{ property: 'Order', direction: 'ascending' }]
        })
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, date, time, category, order } = req.body;

      let datePayload = null;
      if (date) {
        if (time) {
          datePayload = { start: `${date}T${time}:00+09:00` };
        } else {
          datePayload = { start: date };
        }
      }

      const properties = {
        'Name': { title: [{ text: { content: name } }] }
      };
      if (datePayload) properties['Date'] = { date: datePayload };
      if (category) properties['Category'] = { select: { name: category } };
      if (order !== undefined && order !== '') {
        properties['Order'] = { number: Number(order) };
      }

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties
        })
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}