-- =============================================
-- Trainers マスタデータ INSERT
-- Supabase Dashboard > SQL Editor で実行
-- =============================================

INSERT INTO trainers (id, name, personality_match, base_strictness, base_friendliness, description, image_base_url, is_active, sort_order)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567001',
    '竜也',
    ARRAY['perfectionist', 'athlete', 'procrastinator'],
    9, 5,
    '元プロボクサー。厳しいが確実に結果を出す。甘えは一切許さないが、努力する者には全力でサポートする。',
    '/trainers/ryuya',
    true, 1
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567002',
    '陽子',
    ARRAY['hunter', 'flipper', 'dreamer'],
    4, 10,
    'フィットネスインフルエンサー出身。楽しくなければ続かない！をモットーに、笑顔でサポートする。',
    '/trainers/yoko',
    true, 2
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567003',
    '拓海',
    ARRAY['data_lover', 'perfectionist', 'athlete'],
    7, 6,
    '栄養学・運動科学の博士。最新の研究データに基づいた指導で、科学的に最短ルートを導き出す。',
    '/trainers/takumi',
    true, 3
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567004',
    '蓮',
    ARRAY['athlete', 'procrastinator', 'perfectionist'],
    10, 4,
    '元格闘技選手。肉体と精神の限界を超えることを信条とする。修行の先にある変化を一緒に目指す。',
    '/trainers/ren',
    true, 4
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567005',
    '桜',
    ARRAY['dreamer', 'procrastinator', 'flipper'],
    3, 9,
    '産後ダイエット経験者のカウンセラー系コーチ。焦らなくていい、ゆっくり着実に。心の変化を大切にする。',
    '/trainers/sakura',
    true, 5
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567006',
    '健太',
    ARRAY['hunter', 'flipper', 'dreamer'],
    5, 8,
    '元ヤンキーから筋トレにハマってフィットネスの世界へ。タメ口で話す気さくなキャラが人気。仲間感覚で一緒に楽しむ。',
    '/trainers/kenta',
    true, 6
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  personality_match = EXCLUDED.personality_match,
  base_strictness = EXCLUDED.base_strictness,
  base_friendliness = EXCLUDED.base_friendliness,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
