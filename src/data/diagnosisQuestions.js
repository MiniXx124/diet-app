// 性格診断 30問
// options[].type: 'perfectionist'|'flipper'|'hunter'|'procrastinator'|'data_lover'|'athlete'|'dreamer'

export const QUESTIONS = [
  {
    id: 1,
    text: 'ダイエットを決意したとき、まず最初にすることは？',
    options: [
      { label: 'A', text: '詳細な計画表をノートやアプリで作る', type: 'perfectionist' },
      { label: 'B', text: '気合いで即日走り込みを始める', type: 'athlete' },
      { label: 'C', text: 'SNSで「痩せる宣言」をする', type: 'hunter' },
      { label: 'D', text: '「明日から本気でやろう」と決める', type: 'procrastinator' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 2,
    text: '体重計に毎日乗るとしたら、あなたはどうする？',
    options: [
      { label: 'A', text: '朝晩記録してグラフで傾向を分析する', type: 'data_lover' },
      { label: 'B', text: '決めた時間にきっちり記録する', type: 'perfectionist' },
      { label: 'C', text: '気分が乗ったときだけ記録する', type: 'flipper' },
      { label: 'D', text: '乗るのが怖くてつい避けてしまう', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 3,
    text: '話題の新しいダイエット法を見つけたとき、どうする？',
    options: [
      { label: 'A', text: '科学的根拠を調べてから慎重に試す', type: 'data_lover' },
      { label: 'B', text: 'とりあえずすぐ試してみる', type: 'flipper' },
      { label: 'C', text: '「これが最強！」と決めて突き進む', type: 'perfectionist' },
      { label: 'D', text: '「楽そう」という理由だけで試す', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 4,
    text: 'ダイエット成功した人のSNS投稿を見て思うことは？',
    options: [
      { label: 'A', text: '「私もやる！」とシェアして宣言する', type: 'hunter' },
      { label: 'B', text: '「何kg落としたのか気になる」', type: 'data_lover' },
      { label: 'C', text: '「いいね押して、自分も頑張ろう」', type: 'flipper' },
      { label: 'D', text: '「すごいな〜（自分も明日から）」', type: 'procrastinator' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 5,
    text: 'ダイエットの目標を聞かれたら？',
    options: [
      { label: 'A', text: '「○月○日までに○kg減量」と具体的に言える', type: 'perfectionist' },
      { label: 'B', text: '「モテたい」「かっこよく見られたい」', type: 'hunter' },
      { label: 'C', text: '「とにかく細くなりたい！」', type: 'dreamer' },
      { label: 'D', text: '「続ければそのうち結果が出る」', type: 'flipper' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 6,
    text: '運動をして一番テンションが上がる瞬間は？',
    options: [
      { label: 'A', text: '自己記録を更新したとき', type: 'athlete' },
      { label: 'B', text: '仲間と一緒に汗をかいたとき', type: 'hunter' },
      { label: 'C', text: 'フォームが完璧に決まったとき', type: 'perfectionist' },
      { label: 'D', text: '消費カロリーが予想より多かったとき', type: 'data_lover' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 7,
    text: '「ドーナツが食べたい」という衝動にどう対処する？',
    options: [
      { label: 'A', text: '食べた分をカロリー計算して許容内かチェック', type: 'data_lover' },
      { label: 'B', text: '「今日だけ！」とそのまま食べてしまう', type: 'flipper' },
      { label: 'C', text: 'ルールで禁止しているから絶対に食べない', type: 'perfectionist' },
      { label: 'D', text: '食べて「明日から頑張ればいいか」と思う', type: 'procrastinator' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 8,
    text: 'ジムに入会したその日、最初にすることは？',
    options: [
      { label: 'A', text: '全設備を確認してトレーニング計画を立てる', type: 'perfectionist' },
      { label: 'B', text: '即マシンに向かって全力でトレーニング', type: 'athlete' },
      { label: 'C', text: 'ジムの雰囲気と会員の様子をチェック', type: 'hunter' },
      { label: 'D', text: 'とりあえずランニングマシンで走り始める', type: 'flipper' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 9,
    text: 'ダイエット3日目、体重が全く変わらない。どうする？',
    options: [
      { label: 'A', text: '「停滞の原因は何か」と細かく分析する', type: 'data_lover' },
      { label: 'B', text: '「違う方法を試そう」と変更する', type: 'flipper' },
      { label: 'C', text: '「3日じゃ変わらないのは当然」と冷静に続ける', type: 'athlete' },
      { label: 'D', text: '「絶対にそのうち効いてくるはず」と信じる', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 10,
    text: '食事管理の理想的なやり方は？',
    options: [
      { label: 'A', text: 'PFCバランスを全て記録して管理', type: 'data_lover' },
      { label: 'B', text: '「夜は炭水化物なし」など自分ルールを徹底', type: 'perfectionist' },
      { label: 'C', text: '好きなものを我慢しないゆるい制限で継続', type: 'flipper' },
      { label: 'D', text: 'カロリーゼロ食品や置き換え食品を活用', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 11,
    text: 'ダイエットを挫折するとしたら、その理由は？',
    options: [
      { label: 'A', text: '完璧にできない日が続いてモチベが下がる', type: 'perfectionist' },
      { label: 'B', text: '飽きてきて別のことに興味が移った', type: 'flipper' },
      { label: 'C', text: '忙しくて「来月から本気出す」になった', type: 'procrastinator' },
      { label: 'D', text: 'そもそも本格的に始められなかった', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 12,
    text: 'ダイエット仲間がいると？',
    options: [
      { label: 'A', text: '張り合えて俄然やる気が出る', type: 'hunter' },
      { label: 'B', text: 'プレッシャーになってむしろ辛くなる', type: 'perfectionist' },
      { label: 'C', text: '別にいなくても自分のペースでやれる', type: 'athlete' },
      { label: 'D', text: '一緒にやることでモチベが続く', type: 'flipper' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 13,
    text: '理想のトレーナーのタイプは？',
    options: [
      { label: 'A', text: 'データと根拠で科学的に指導してくれる', type: 'data_lover' },
      { label: 'B', text: '限界まで追い込んでくれる', type: 'athlete' },
      { label: 'C', text: 'ひたすら褒めて励ましてくれる', type: 'hunter' },
      { label: 'D', text: '楽に痩せる方法を教えてくれる', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 14,
    text: 'ダイエットの成果をSNSで発信するとしたら？',
    options: [
      { label: 'A', text: '詳細なデータと体組成をグラフで公開', type: 'data_lover' },
      { label: 'B', text: '毎日の記録を欠かさず投稿して継続をアピール', type: 'perfectionist' },
      { label: 'C', text: 'いいねが励みになるから積極的に発信', type: 'hunter' },
      { label: 'D', text: '発信より修行。ひたすら鍛える', type: 'athlete' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 15,
    text: '週に何日、運動できそう？',
    options: [
      { label: 'A', text: '毎日（休んだら負けな気がする）', type: 'athlete' },
      { label: 'B', text: '計画通りに週3〜4日', type: 'perfectionist' },
      { label: 'C', text: '気分次第で週2〜5日くらい', type: 'flipper' },
      { label: 'D', text: 'できれば週1〜2日、うまくいけば', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 16,
    text: '食べ過ぎてしまった翌日、どうする？',
    options: [
      { label: 'A', text: 'オーバーカロリー分を計算して翌日以降で調整', type: 'data_lover' },
      { label: 'B', text: '「今日はリセット日」として断食する', type: 'perfectionist' },
      { label: 'C', text: '「まあいっか」と通常モードで過ごす', type: 'flipper' },
      { label: 'D', text: '「今週はもうダメだ。来週から頑張ろう」', type: 'procrastinator' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 17,
    text: 'ダイエット中のモチベーションアップ方法は？',
    options: [
      { label: 'A', text: '体重グラフの変化を眺めて達成感を感じる', type: 'data_lover' },
      { label: 'B', text: 'フォロワーの「頑張れ！」コメントが励みになる', type: 'hunter' },
      { label: 'C', text: '好きなモデルや目標の体型写真を見る', type: 'dreamer' },
      { label: 'D', text: '昨日の自分より少しでも成長できれば十分', type: 'athlete' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 18,
    text: '「ダイエット失敗」とは、あなたにとってどんな状態？',
    options: [
      { label: 'A', text: '目標の数字に届かなかったこと', type: 'perfectionist' },
      { label: 'B', text: '1週間未満で挫折してしまうこと', type: 'flipper' },
      { label: 'C', text: '誰にも「痩せた？」と気づいてもらえないこと', type: 'hunter' },
      { label: 'D', text: 'ちゃんと始められなかったこと', type: 'procrastinator' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 19,
    text: '体重が1週間変わらないとき、考えることは？',
    options: [
      { label: 'A', text: '「停滞期の仕組みを分析してブレイクスルーを狙う」', type: 'data_lover' },
      { label: 'B', text: '「もっと食事を減らして追い込む」', type: 'athlete' },
      { label: 'C', text: '「違う方法を試してみようかな」', type: 'flipper' },
      { label: 'D', text: '「あのマッサージグッズが効くかも」と検索する', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 20,
    text: '夜中に小腹が空いたとき？',
    options: [
      { label: 'A', text: 'ルールで禁止しているので絶対食べない', type: 'perfectionist' },
      { label: 'B', text: 'カロリー計算して許容範囲内なら食べる', type: 'data_lover' },
      { label: 'C', text: '食べた分は翌朝走って消費する', type: 'athlete' },
      { label: 'D', text: '食べて「明日はちゃんとしよう」と思う', type: 'procrastinator' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 21,
    text: 'あなたのスマホに入っているアプリは？',
    options: [
      { label: 'A', text: '健康・栄養管理アプリが5個以上入っている', type: 'data_lover' },
      { label: 'B', text: 'ダイエット系インフルエンサーをフォローしている', type: 'hunter' },
      { label: 'C', text: 'ダイエット系アプリを入れては消すを繰り返している', type: 'flipper' },
      { label: 'D', text: 'スマホより実際に動く方が大事', type: 'athlete' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 22,
    text: '「最近痩せた？」と言われたら？',
    options: [
      { label: 'A', text: '「そうなんです！先月から○kgで…」とデータで返す', type: 'data_lover' },
      { label: 'B', text: 'すごく嬉しくて写真を撮ってSNSに上げる', type: 'hunter' },
      { label: 'C', text: '「ありがとう！もっと頑張る！」と更に火がつく', type: 'perfectionist' },
      { label: 'D', text: '「本当に！？嬉しい！」と単純に喜ぶ', type: 'flipper' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 23,
    text: '理想の体型になった自分は何をしている？',
    options: [
      { label: 'A', text: '体脂肪率・筋肉量のパーフェクトな状態を維持', type: 'data_lover' },
      { label: 'B', text: '好きな服が何でも似合っていて毎日写真を投稿', type: 'hunter' },
      { label: 'C', text: 'フルマラソン完走や大会で上位入賞', type: 'athlete' },
      { label: 'D', text: '何もしなくても太らない体質になっている', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 24,
    text: 'ダイエットアプリ、続けられる？',
    options: [
      { label: 'A', text: '毎日欠かさず記録するから絶対続く', type: 'perfectionist' },
      { label: 'B', text: '最初は使うけどだんだん飽きる', type: 'flipper' },
      { label: 'C', text: 'グラフが下がるのが楽しくて続けられる', type: 'data_lover' },
      { label: 'D', text: 'アプリより楽なサプリの方が向いている', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 25,
    text: '「糖質制限」という言葉を聞いて最初に思うことは？',
    options: [
      { label: 'A', text: '「何gまでOK？GI値は？」と調べ始める', type: 'data_lover' },
      { label: 'B', text: '「効きそう！すぐやってみよう！」と即決', type: 'flipper' },
      { label: 'C', text: '「炭水化物ゼロはさすがに無理…」', type: 'dreamer' },
      { label: 'D', text: '「マクロ管理しながら計画的に取り組む」', type: 'perfectionist' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 26,
    text: '筋トレについて一番近い考えは？',
    options: [
      { label: 'A', text: '「毎日鍛えて限界を超え続ける」', type: 'athlete' },
      { label: 'B', text: '「正確なフォームで計画通りのセット数を」', type: 'perfectionist' },
      { label: 'C', text: '「消費カロリーを最大化できる種目を選ぶ」', type: 'data_lover' },
      { label: 'D', text: '「きついのは嫌。ヨガや軽い運動がいい」', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 27,
    text: '「明日から本気でやる」、どのくらい言う？',
    options: [
      { label: 'A', text: 'ほぼ毎週言っている', type: 'procrastinator' },
      { label: 'B', text: '言ったことはない。決めたらすぐ始める', type: 'athlete' },
      { label: 'C', text: '新月や月初などキリのいい日に合わせる', type: 'flipper' },
      { label: 'D', text: '言いながらちゃんと計画は立てている', type: 'perfectionist' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 28,
    text: 'ダイエットのゴールに最も近いのは？',
    options: [
      { label: 'A', text: '「体脂肪率○%、筋肉量○kgを達成する」', type: 'data_lover' },
      { label: 'B', text: '「○月○日のイベントまでに○kgになる」', type: 'perfectionist' },
      { label: 'C', text: '「SNSで100いいね以上もらえるビフォーアフター」', type: 'hunter' },
      { label: 'D', text: '「自然と痩せていく体質になりたい」', type: 'dreamer' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 29,
    text: 'ダイエットで一番つらいのは？',
    options: [
      { label: 'A', text: '記録が面倒で続けられないこと', type: 'flipper' },
      { label: 'B', text: '努力が数字に出ないとき', type: 'perfectionist' },
      { label: 'C', text: '好きなものを食べられないこと', type: 'dreamer' },
      { label: 'D', text: '頑張ってるのに誰も気づいてくれないこと', type: 'hunter' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
  {
    id: 30,
    text: 'ダイエット成功後、まず何をする？',
    options: [
      { label: 'A', text: '「次の目標を設定して更なる高みへ」', type: 'perfectionist' },
      { label: 'B', text: '「ビフォーアフターをSNSに投稿して報告」', type: 'hunter' },
      { label: 'C', text: '「好きなものを思いっきり食べる」', type: 'dreamer' },
      { label: 'D', text: '「さらに強い体を目指してトレーニングを続ける」', type: 'athlete' },
      { label: 'E', text: 'どれにも当てはまらない', type: null },
    ],
  },
]

// 回答からタイプを計算する
export function calculatePersonalityType(answers) {
  const scores = {}
  answers.forEach(({ type }) => {
    if (type) scores[type] = (scores[type] || 0) + 1
  })
  // 同点の場合は配列の先頭（より多く回答したもの）を優先
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? 'flipper'
}
