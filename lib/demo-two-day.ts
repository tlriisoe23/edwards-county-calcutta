// The fifty-team, two-man, two-day fixture — the same fifty teams the
// leaderboard's own `demoTwoDay()` builds, so an evening can be rehearsed
// across both products: the flights drawn there are the flights auctioned
// here, and each team's pop is the one the leaderboard worked out.
//
// It is a literal table rather than the leaderboard's generator because the two
// products share no code by design (see AGENTS.md). That means it can drift:
// the names, flights and pops below were taken from that fixture on
// 2026-09-18, and `tests/two-day-demo.mjs` checks the shape they have to keep.
// If the leaderboard's fixture is reshaped, this one has to be re-emitted.
//
// Columns: team name · first player · second player · flight (0–3) · pop.
export const twoDayFlights = ["Championship", "A Flight", "B Flight", "C Flight"];

export const twoDayTeams: [name: string, one: string, two: string, flight: number, pop: number][] = [
    ["Johnson / Phillips", "Alex Johnson", "Taylor Phillips", 0, 0],
    ["Miller / Campbell", "Sam Miller", "Jamie Campbell", 0, 1],
    ["Davis / Parker", "Chris Davis", "Casey Parker", 0, 1],
    ["Wilson / Evans", "Jordan Wilson", "Pat Evans", 0, 1.5],
    ["Anderson / Edwards", "Riley Anderson", "Morgan Edwards", 0, 1.5],
    ["Brown / Collins", "Drew Brown", "Quinn Collins", 0, 1.5],
    ["Thompson / Stewart", "Alex Thompson", "Taylor Stewart", 0, 2],
    ["Garcia / Morris", "Sam Garcia", "Jamie Morris", 0, 2],
    ["Martin / Rogers", "Chris Martin", "Casey Rogers", 0, 2],
    ["Lee / Reed", "Jordan Lee", "Pat Reed", 0, 2],
    ["Taylor / Cook", "Riley Taylor", "Morgan Cook", 0, 2.5],
    ["Clark / Morgan", "Drew Clark", "Quinn Morgan", 0, 2.5],
    ["Robinson / Bell", "Alex Robinson", "Taylor Bell", 0, 2.5],
    ["Walker / Murphy", "Sam Walker", "Jamie Murphy", 1, 0],
    ["Hall / Bailey", "Chris Hall", "Casey Bailey", 1, 0],
    ["Allen / Rivera", "Jordan Allen", "Pat Rivera", 1, 0],
    ["Young / Cooper", "Riley Young", "Morgan Cooper", 1, 0],
    ["King / Richardson", "Drew King", "Quinn Richardson", 1, 0.5],
    ["Wright / Cox", "Alex Wright", "Taylor Cox", 1, 0.5],
    ["Scott / Ward", "Sam Scott", "Jamie Ward", 1, 0.5],
    ["Green / Torres", "Chris Green", "Casey Torres", 1, 0.5],
    ["Baker / Peterson", "Jordan Baker", "Pat Peterson", 1, 1],
    ["Adams / Gray", "Riley Adams", "Morgan Gray", 1, 1],
    ["Nelson / Ramirez", "Drew Nelson", "Quinn Ramirez", 1, 1],
    ["Carter / James", "Alex Carter", "Taylor James", 1, 1.5],
    ["Mitchell / Watson", "Sam Mitchell", "Jamie Watson", 1, 1.5],
    ["Perez / Brooks", "Chris Perez", "Casey Brooks", 2, 0],
    ["Roberts / Kelly", "Jordan Roberts", "Pat Kelly", 2, 0],
    ["Turner / Sanders", "Riley Turner", "Morgan Sanders", 2, 0],
    ["Phillips / Price", "Drew Phillips", "Quinn Price", 2, 0.5],
    ["Campbell / Bennett", "Alex Campbell", "Taylor Bennett", 2, 0.5],
    ["Parker / Wood", "Sam Parker", "Jamie Wood", 2, 0.5],
    ["Evans / Barnes", "Chris Evans", "Casey Barnes", 2, 0.5],
    ["Edwards / Ross", "Jordan Edwards", "Pat Ross", 2, 1],
    ["Collins / Henderson", "Riley Collins", "Morgan Henderson", 2, 1],
    ["Stewart / Coleman", "Drew Stewart", "Quinn Coleman", 2, 1],
    ["Morris / Jenkins", "Alex Morris", "Taylor Jenkins", 2, 1.5],
    ["Rogers / Perry", "Sam Rogers", "Jamie Perry", 2, 1.5],
    ["Reed / Powell", "Chris Reed", "Casey Powell", 3, 0],
    ["Cook / Johnson", "Jordan Cook", "Pat Johnson", 3, 0],
    ["Morgan / Miller", "Riley Morgan", "Morgan Miller", 3, 0],
    ["Bell / Davis", "Drew Bell", "Quinn Davis", 3, 1],
    ["Murphy / Wilson", "Alex Murphy", "Taylor Wilson", 3, 1],
    ["Bailey / Anderson", "Sam Bailey", "Jamie Anderson", 3, 1],
    ["Rivera / Brown", "Chris Rivera", "Casey Brown", 3, 1],
    ["Cooper / Thompson", "Jordan Cooper", "Pat Thompson", 3, 2],
    ["Richardson / Garcia", "Riley Richardson", "Morgan Garcia", 3, 2],
    ["Cox / Martin", "Drew Cox", "Quinn Martin", 3, 2],
    ["Ward / Lee", "Alex Ward", "Taylor Lee", 3, 3],
    ["Torres / Taylor", "Sam Torres", "Jamie Taylor", 3, 3],
];
