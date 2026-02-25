// 7つの性格タイプ定義

export const PERSONALITY_TYPES = {
  perfectionist: {
    id: 'perfectionist',
    name: '完璧主義ストイッカー',
    emoji: '🎯',
    colorClass: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    lightBg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
    description:
      '計画を完璧に立ててこそ本番！ルールを一度決めたら死守する鋼の意志を持つあなた。「やるなら完璧に」が信条で、綿密なスケジュールと数値目標でダイエットに臨みます。ただし少しでも崩れると「もういいや」モードに突入しがちなのが課題。',
    strengths: ['計画力・継続力が高い', '意志が強くルールを守れる', '目標設定が具体的'],
    weaknesses: ['完璧主義で息切れしやすい', '失敗を引きずりやすい', '融通が利かない場面がある'],
    advice:
      '「80点でも大合格」くらいのゆとりを持とう。完璧じゃない日があっても、続けることの方がずっと大切。',
  },
  flipper: {
    id: 'flipper',
    name: '三日坊主フリッパー',
    emoji: '🐬',
    colorClass: 'cyan',
    gradient: 'from-cyan-400 to-blue-500',
    lightBg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    badge: 'bg-cyan-100 text-cyan-700',
    description:
      '新しいことへのアンテナが高く、始める勢いは誰にも負けない！ダイエット法も最新トレンドをすぐキャッチして即実行。ただし飽きっぽさが最大の敵で、1つのことを続けるのが苦手。飽きたら次の方法へ…というループを繰り返してしまいがち。',
    strengths: ['新しいことへの適応が早い', '始める行動力がある', '楽しみながら取り組める'],
    weaknesses: ['継続が苦手', '飽きると別の方法を探し始める', '成果が出る前に辞めてしまう'],
    advice:
      '飽きを「新しい工夫をするサイン」として活かそう。毎日少しずつ変化を加えることで、継続のコツをつかめる。',
  },
  hunter: {
    id: 'hunter',
    name: 'いいね！ハンター',
    emoji: '📸',
    colorClass: 'orange',
    gradient: 'from-orange-400 to-pink-500',
    lightBg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
    description:
      '承認欲求がエネルギー源！SNSでの「痩せた？」「綺麗になった！」の一言がなにより嬉しい。フォロワーからのいいねやコメントがモチベアップに直結するソーシャル型。周りの反応を原動力に変える天才で、仲間がいると驚くほどのパフォーマンスを発揮します。',
    strengths: ['仲間やコミュニティで力を発揮する', '発信することで継続できる', '承認を力に変えられる'],
    weaknesses: ['承認がないとやる気が下がる', '他者の目を気にしすぎる', '比較で落ち込みやすい'],
    advice:
      '発信を継続のツールとして活用しよう。ただし、他人比較よりも「昨日の自分」との比較がメンタルを守る秘訣。',
  },
  procrastinator: {
    id: 'procrastinator',
    name: '明日から本気マン',
    emoji: '📅',
    colorClass: 'amber',
    gradient: 'from-amber-400 to-orange-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    description:
      '「明日から本気出す」「来月からちゃんとやる」が口癖のあなた。実は心の中ではいつも本気でやりたいと思っている！先延ばしのプロではあるものの、一度エンジンがかかると驚くほどの底力を発揮します。あとは最初の一歩を踏み出すだけ。',
    strengths: ['一度やると決めると集中力がある', '底力・爆発力がある', '柔軟で環境適応しやすい'],
    weaknesses: ['先延ばし癖がある', '始めるまでに時間がかかる', '外的プレッシャーがないと動きにくい'],
    advice:
      '「完璧に準備してから」ではなく「今日1分だけ」を合言葉に。小さく始めることで、あなたの底力が目覚める。',
  },
  data_lover: {
    id: 'data_lover',
    name: 'データ沼溺愛者',
    emoji: '📊',
    colorClass: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    description:
      '体重・体脂肪率・消費カロリー・PFCバランス…数字に愛される分析の鬼！「なぜ効果が出たか」「なぜ停滞しているか」をデータで理解し、科学的に攻略するのが得意。記録すること自体が楽しみで、グラフが下がると最高に満足します。',
    strengths: ['データをもとに的確な判断ができる', '継続して記録できる', '科学的思考で停滞を打破できる'],
    weaknesses: ['数字に縛られてストレスを感じることがある', '記録できない日を気にしすぎる', '分析より実行が遅れがち'],
    advice:
      'データは羅針盤、でも体の感覚も大切にしよう。数字の変化に一喜一憂せず、週単位のトレンドで判断するのがコツ。',
  },
  athlete: {
    id: 'athlete',
    name: '修行僧アスリート',
    emoji: '🔥',
    colorClass: 'red',
    gradient: 'from-red-500 to-rose-600',
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    description:
      '限界を超えることに喜びを感じる、正真正銘の体育会系。「追い込んでこそ価値がある」という信念のもと、食事管理も運動も常に高強度。体を動かすことへの情熱は誰にも負けない。ただし追い込みすぎて燃え尽きないよう注意が必要です。',
    strengths: ['高い運動意欲と継続力', 'ストイックに取り組める', '体づくりへの理解が深い'],
    weaknesses: ['休息を軽視しがち', '過負荷で怪我や燃え尽き症候群になりやすい', '楽しさより義務感になりやすい'],
    advice:
      '休息も鍛錬の一部。超回復を味方にすると、さらに強い体に近づける。ON/OFFのメリハリが成長を加速させる。',
  },
  dreamer: {
    id: 'dreamer',
    name: '楽痩せドリーマー',
    emoji: '✨',
    colorClass: 'pink',
    gradient: 'from-pink-400 to-rose-500',
    lightBg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    badge: 'bg-pink-100 text-pink-700',
    description:
      '「寝ながら痩せられたら最高」と心から思っているポジティブな夢想家。楽な方法へのアンテナが高く、魔法のようなダイエット法やグッズへの期待がロマン。実はその楽観力と柔軟な思考が最大の武器で、正しく活用すれば続けられるダイエットが見つかります。',
    strengths: ['ポジティブ思考でストレスを溜めない', '楽しいことには継続できる', '柔軟で無理しない持続力がある'],
    weaknesses: ['努力を避けがち', '魔法のような方法に期待しすぎる', '長期的な取り組みが苦手'],
    advice:
      '「楽しく続けられる方法」は実在する！まず続けられる範囲で始めること。小さな習慣が積み重なると、気づけば変わっている。',
  },
}
