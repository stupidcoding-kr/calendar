export default async function handler(req, res) {
  // CORS 헤더 설정 (노션 및 외부 임베드 환경 허용)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS (Preflight) 요청 신속 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const NOTION_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_KEY || !DATABASE_ID) {
    return res.status(500).json({ error: "Vercel 환경 변수가 설정되지 않았습니다." });
  }

  const headers = {
    'Authorization': `Bearer ${NOTION_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  try {
    // 1. 노션 DB 조회
    if (req.method === 'GET') {
      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 2. 일정 추가
    if (req.method === 'POST') {
      const { title, startDate, endDate, group } = req.body;
      const body = {
        parent: { database_id: DATABASE_ID },
        properties: {
          Name: { title: [{ text: { content: title || '' } }] },
          Date: { date: { start: startDate, end: (endDate && endDate !== startDate) ? endDate : null } },
          ...(group ? { Category: { select: { name: group } } } : {})
        }
      };
      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 3. 일정 수정
    if (req.method === 'PATCH') {
      const { id, title, startDate, endDate, group } = req.body;

      if (!id || id.startsWith('local_')) {
        const body = {
          parent: { database_id: DATABASE_ID },
          properties: {
            Name: { title: [{ text: { content: title || '' } }] },
            Date: { date: { start: startDate, end: (endDate && endDate !== startDate) ? endDate : null } },
            ...(group ? { Category: { select: { name: group } } } : {})
          }
        };
        const response = await fetch('https://api.notion.com/v1/pages', { method: 'POST', headers, body: JSON.stringify(body) });
        const data = await response.json();
        return res.status(200).json(data);
      }

      const body = {
        properties: {
          Name: { title: [{ text: { content: title || '' } }] },
          Date: { date: { start: startDate, end: (endDate && endDate !== startDate) ? endDate : null } },
          Category: group ? { select: { name: group } } : { select: null }
        }
      };
      const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 4. 일정 삭제
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id || id.startsWith('local_')) return res.status(200).json({ success: true });
      const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ archived: true })
      });
      const data = await response.json();
      return res.status(200).json(data);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}