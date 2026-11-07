import {
  SurvivalChallengeRoomState,
  SurvivalScenario,
  SurvivalItem,
  SurvivalScoreSummary,
} from "../types";

export interface SurvivalCallbacks {
  onStateUpdate?: (state: SurvivalChallengeRoomState) => void;
  onScoresCalculated?: (scores: Record<string, SurvivalScoreSummary>) => void;
}

export const LOST_AT_SEA_ITEMS: SurvivalItem[] = [
  {
    id: 1,
    title: "Sekstans nawigacyjny",
    description: "Tradycyjny instrument optyczny służący do wyznaczania szerokości geograficznej na podstawie słońca i gwiazd.",
    expertRank: 15,
    expertRationale: "Całkowicie bezużyteczny bez tablic astronomicznych i dokładnego chronometru. Ponadto na tratwie ratunkowej bez napędu i tak nie ma możliwości sterowania kursem.",
  },
  {
    id: 2,
    title: "Lusterko sygnalizacyjne do golenia",
    description: "Małe lusterko ze szkła i metalu.",
    expertRank: 1,
    expertRationale: "Najważniejszy pojedynczy przedmiot! Błysk lusterka w słońcu jest widoczny z samolotu ratowniczego z odległości ponad 30-40 mil morskich i przez chmury.",
  },
  {
    id: 3,
    title: "20-litrowy kanister słodkiej wody",
    description: "Szczelnie zamknięty pojemnik z czystą wodą pitną.",
    expertRank: 3,
    expertRationale: "Kluczowa do przeżycia fizjologicznego. Bez wody człowiek na oceanie w słońcu i wietrze przeżyje zaledwie 3-5 dni. Woda pozwala też na trawienie pokarmu.",
  },
  {
    id: 4,
    title: "Moskitiera przeciw owadom",
    description: "Gęsta siatka z tkaniny syntetycznej.",
    expertRank: 14,
    expertRationale: "Na otwartym oceanie nie ma moskitów ani komarów. Może posłużyć jedynie jako bardzo prowizoryczny cień lub worek.",
  },
  {
    id: 5,
    title: "Skrzynka racji żywnościowych wojskowych (C-rations)",
    description: "Hermetycznie pakowane racje przetrwania o wysokiej kaloryczności.",
    expertRank: 4,
    expertRationale: "Podstawowe źródło energii, witamin i soli mineralnych. Zapewnia siły fizyczne i morale załodze.",
  },
  {
    id: 6,
    title: "Mapy nawigacyjne Oceanu Spokojnego",
    description: "Szczegółowe mapy prądów i głębokości Pacyfiku.",
    expertRank: 13,
    expertRationale: "Bezużyteczne bez przyrządów nawigacyjnych i znajomości aktualnej pozycji. Tratwa ratunkowa dryfuje z wiatrem i prądem, więc mapa nie ułatwia dotarcia do lądu.",
  },
  {
    id: 7,
    title: "Pływająca poduszka fotelowa",
    description: "Wodoodporna poduszka ratunkowa z uchwytem.",
    expertRank: 9,
    expertRationale: "Zapewnia dodatkową wyporność osobie za burtą, może posłużyć jako rzutka ratunkowa lub ochrona przed otarciami na tratwie.",
  },
  {
    id: 8,
    title: "10-litrowy kanister mieszanki oleju i benzyny",
    description: "Paliwo z silnika pomocniczego.",
    expertRank: 2,
    expertRationale: "Drugi najważniejszy sygnał ratunkowy. Rozlany na powierzchni oceanu tworzy gigantyczną, lśniącą tęczową plamę widoczną z samolotu patrolowego z wielu mil; można go też bezpiecznie podpalić w nocy.",
  },
  {
    id: 9,
    title: "Małe radio tranzystorowe AM/FM",
    description: "Bateryjne radio kieszonkowe.",
    expertRank: 12,
    expertRationale: "To wyłącznie odbiornik, nie posiada nadajnika SOS. Na otwartym oceanie, z dala od stacji naziemnych, nie odbierze żadnych sygnałów.",
  },
  {
    id: 10,
    title: "Puszka środka odstraszającego rekiny",
    description: "Repelent chemiczny przeciw rekinom.",
    expertRank: 10,
    expertRationale: "Daje poczucie bezpieczeństwa psychologicznego i odstrasza drapieżniki w razie konieczności wejścia do wody, ale dopóki tratwa jest szczelna, nie jest kluczowy.",
  },
  {
    id: 11,
    title: "20 m² nieprzemakalnego tworzywa (brezent)",
    description: "Duży arkusz grubego, ciemnego plastiku.",
    expertRank: 5,
    expertRationale: "Niezbędny do osłony przed zabójczym promieniowaniem słonecznym (udar cieplny) oraz do zbierania bezcennej wody deszczowej i skraplającej się rosy.",
  },
  {
    id: 12,
    title: "Butelka 80-procentowego rumu",
    description: "Mocny alkohol wysokoprocentowy.",
    expertRank: 11,
    expertRationale: "Picie alkoholu na tratwie przyspiesza śmiertelne odwodnienie organizmu. Przydatny wyłącznie jako zewnętrzny środek odkażający skaleczenia.",
  },
  {
    id: 13,
    title: "4,5 metra liny nylonowej",
    description: "Mocna, elastyczna linka żeglarska.",
    expertRank: 8,
    expertRationale: "Kluczowa do przywiązania brezentu, zabezpieczenia kanistrów z wodą i racji przed zmyciem przez fale oraz spięcia ekwipunku.",
  },
  {
    id: 14,
    title: "Dwa pudełka batonów czekoladowych",
    description: "Czekolada deserowa bogata w tłuszcz i cukier.",
    expertRank: 6,
    expertRationale: "Błyskawiczne źródło łatwo przyswajalnej glukozy i kalorii, podnoszące morale i siły w pierwszych krytycznych dobach.",
  },
  {
    id: 15,
    title: "Zestaw haczyków i żyłki do połowu ryb",
    description: "Kompletny przybornik wędkarski.",
    expertRank: 7,
    expertRationale: "Zapewnia długoterminowe zaopatrzenie w świeże białko i płyn z tkanek ryb, gdy racje żywnościowe ulegną wyczerpaniu.",
  },
];

export const NASA_MOON_ITEMS: SurvivalItem[] = [
  {
    id: 1,
    title: "Pudełko zapałek",
    description: "Standardowe zapałki siarkowe.",
    expertRank: 15,
    expertRationale: "Na Księżycu nie ma atmosfery ani tlenu, więc zapałki w żaden sposób nie mogą się zapalić.",
  },
  {
    id: 2,
    title: "Koncentrat żywnościowy",
    description: "Wysokoenergetyczne racje dla astronautów.",
    expertRank: 4,
    expertRationale: "Wydajne źródło energii o małej masie i objętości, niezbędne do pokonania pieszego dystansu do bazy.",
  },
  {
    id: 3,
    title: "15 metrów liny nylonowej",
    description: "Wytrzymała lina alpinistyczna.",
    expertRank: 6,
    expertRationale: "Pomocna przy pokonywaniu kraterów i stromych uskoków księżycowych oraz do wiązania rannych lub ładunku.",
  },
  {
    id: 4,
    title: "Spadochron z jedwabiu",
    description: "Czasza spadochronowa z mocnego jedwabiu.",
    expertRank: 8,
    expertRationale: "Jedwab odbija promienie słoneczne, służąc jako tarcza przed intensywnym nagrzaniem słonecznym na oświetlonej stronie.",
  },
  {
    id: 5,
    title: "Przenośny ogrzewacz słoneczny",
    description: "Zasilana słońcem jednostka grzewcza.",
    expertRank: 13,
    expertRationale: "Nieprzydatny po oświetlonej stronie Księżyca (temperatura dochodzi do +120°C); skafandry kosmiczne mają własne systemy grzewcze.",
  },
  {
    id: 6,
    title: "Dwa pistolety kalibru .45",
    description: "Pistolety wojskowe z ostrą amunicją.",
    expertRank: 11,
    expertRationale: "Mogą wytworzyć minimalny impuls odrzutowy przy wystrzale w próżni, ale są skrajnie niebezpieczne i nieefektywne.",
  },
  {
    id: 7,
    title: "Jedno opakowanie odwodnionego mleka",
    description: "Mleko w proszku.",
    expertRank: 12,
    expertRationale: "Wymaga dużej ilości cennej wody do rozrobienia, co czyni je znacznie gorszym źródłem kalorii niż gotowy koncentrat.",
  },
  {
    id: 8,
    title: "Dwa 45-kilogramowe zbiorniki tlenu",
    description: "Zbiorniki ze skroplonym tlenem medycznym.",
    expertRank: 1,
    expertRationale: "Najważniejszy element przeżycia! Bez tlenu astronauta traci przytomność w kilkanaście sekund, a śmierć następuje w kilka minut.",
  },
  {
    id: 9,
    title: "Gwiezdna mapa konstelacji",
    description: "Mapa nieba z siatką współrzędnych.",
    expertRank: 3,
    expertRationale: "Główny instrument nawigacyjny na Księżycu. W próżni gwiazdy są doskonale widoczne nawet w dzień.",
  },
  {
    id: 10,
    title: "Samopompująca się tratwa ratunkowa",
    description: "Tratwa z butlą CO2.",
    expertRank: 9,
    expertRationale: "Butla z dwutlenkiem węgla może posłużyć jako pędnik manewrowy, a kadłub tratwy jako sanie do ciągnięcia sprzętu.",
  },
  {
    id: 11,
    title: "Kompas magnetyczny",
    description: "Tradycyjny kompas igłowy.",
    expertRank: 14,
    expertRationale: "Księżyc nie posiada globalnego pola magnetycznego, więc kompas jest bezużyteczny.",
  },
  {
    id: 12,
    title: "20 litrów wody",
    description: "Woda w hermetycznych kanistrach.",
    expertRank: 2,
    expertRationale: "Niezbędna do nawodnienia oraz do zasilania układu chłodzenia skafandra kosmicznego.",
  },
  {
    id: 13,
    title: "Rakiety sygnalizacyjne",
    description: "Pirotechniczne flary sygnalizacyjne.",
    expertRank: 10,
    expertRationale: "Nie palą się w próżni bez utleniacza, ale ładunek pirotechniczny zawiera własny utleniacz i wygeneruje jasny błysk widoczny z dużej odległości.",
  },
  {
    id: 14,
    title: "Apteczka pierwszej pomocy ze strzykawkami ciśnieniowymi",
    description: "Środki medyczne dostosowane do skafandrów ciśnieniowych.",
    expertRank: 7,
    expertRationale: "Specjalne strzykawki pozwalają podać środki przeciwbólowe i leki bezpośrednio przez zawory skafandra.",
  },
  {
    id: 15,
    title: "Nadajnik-odbiornik FM zasilany energią słoneczną",
    description: "Radiostacja fal ultrakrótkich.",
    expertRank: 5,
    expertRationale: "Umożliwia łączność radiową w linii wzroku ze statkiem macierzystym lub bazą.",
  },
];

export function getSurvivalBracket(score: number): { range: string; label: string; description: string } {
  if (score <= 25) {
    return {
      range: "0 – 25",
      label: "Doskonały (Światowa klasa przetrwania)",
      description: "Wybitne opanowanie priorytetów! Zespół podjął wzorowe decyzje, umożliwiając szybkie odnalezienie i bezpieczny powrót.",
    };
  }
  if (score <= 32) {
    return {
      range: "26 – 32",
      label: "Dobry",
      description: "Bardzo trafne decyzje. Skuteczna sygnalizacja ratunkowa i rozsądne gospodarowanie krytycznymi zasobami.",
    };
  }
  if (score <= 45) {
    return {
      range: "33 – 45",
      label: "Przeciętny",
      description: "Szanse na przetrwanie były wyrównane. Popełniono błędy w priorytetyzacji nawigacji lub sygnalizacji.",
    };
  }
  if (score <= 55) {
    return {
      range: "46 – 55",
      label: "Dostateczny",
      description: "Poważne błędy decyzyjne, które znacznie opóźniły akcję ratunkową i naraziły grupę na deficyt wody.",
    };
  }
  if (score <= 70) {
    return {
      range: "56 – 70",
      label: "Słaby",
      description: "Wysokie zagrożenie życia z powodu odwodnienia lub braku skutecznej sygnalizacji ratunkowej.",
    };
  }
  return {
    range: "71+",
    label: "Bardzo słaby (Krytyczny)",
    description: "Katastrofalny dobór priorytetów. Niestety szanse na przeżycie w tych warunkach były minimalne.",
  };
}

export function calculateSurvivalDifference(
  userRanking: number[], // Array of item IDs ordered 1st to 15th
  items: SurvivalItem[]
): number {
  let diff = 0;
  userRanking.forEach((itemId, index) => {
    const userRank = index + 1;
    const item = items.find((it) => it.id === itemId);
    if (item) {
      diff += Math.abs(userRank - item.expertRank);
    }
  });
  return diff;
}

export class SurvivalChallengeSession {
  public roomCode: string;
  public state: SurvivalChallengeRoomState;
  private callbacks: SurvivalCallbacks;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(
    roomCode: string,
    scenario: SurvivalScenario = "LOST_AT_SEA",
    callbacks: SurvivalCallbacks = {}
  ) {
    this.roomCode = roomCode;
    this.callbacks = callbacks;

    const items = scenario === "LOST_AT_SEA" ? LOST_AT_SEA_ITEMS : NASA_MOON_ITEMS;
    this.state = {
      roomCode,
      scenario,
      phase: "LOBBY",
      items,
      individualRankings: {},
      individualSubmitted: {},
      teamRankings: {},
      teamSubmitted: {},
      scores: {},
      timerTotal: 300, // 5 min default for ranking
      timerRemaining: 300,
    };
  }

  public setScenario(scenario: SurvivalScenario) {
    this.state.scenario = scenario;
    this.state.items = scenario === "LOST_AT_SEA" ? LOST_AT_SEA_ITEMS : NASA_MOON_ITEMS;
    this.state.individualRankings = {};
    this.state.individualSubmitted = {};
    this.state.teamRankings = {};
    this.state.teamSubmitted = {};
    this.state.scores = {};
    this.callbacks.onStateUpdate?.(this.state);
  }

  public startIndividualPhase(durationSeconds: number = 300) {
    this.state.phase = "INDIVIDUAL_RANKING";
    this.state.timerTotal = durationSeconds;
    this.state.timerRemaining = durationSeconds;
    this.startTimer(() => {
      this.startTeamPhase();
    });
    this.callbacks.onStateUpdate?.(this.state);
  }

  public submitIndividualRanking(playerId: string, ranking: number[]) {
    this.state.individualRankings[playerId] = ranking;
    this.state.individualSubmitted[playerId] = true;
    this.callbacks.onStateUpdate?.(this.state);
  }

  public startTeamPhase(durationSeconds: number = 420) {
    this.clearTimer();
    this.state.phase = "TEAM_RANKING";
    this.state.timerTotal = durationSeconds;
    this.state.timerRemaining = durationSeconds;
    this.startTimer(() => {
      this.revealResults();
    });
    this.callbacks.onStateUpdate?.(this.state);
  }

  public submitTeamRanking(groupId: string, ranking: number[]) {
    this.state.teamRankings[groupId] = ranking;
    this.state.teamSubmitted[groupId] = true;
    this.callbacks.onStateUpdate?.(this.state);
  }

  public revealResults() {
    this.clearTimer();
    this.state.phase = "EXPERT_REVEAL";
    this.calculateAllScores();
    this.callbacks.onStateUpdate?.(this.state);
  }

  public startDebriefing(question?: string) {
    this.state.phase = "DEBRIEFING";
    this.state.selectedDebriefQuestion = question;
    this.callbacks.onStateUpdate?.(this.state);
  }

  public calculateAllScores() {
    // 1. Calculate each individual's score
    const individualScores: Record<string, number> = {};
    let totalIndScore = 0;
    let countInd = 0;

    for (const [playerId, ranking] of Object.entries(this.state.individualRankings)) {
      const score = calculateSurvivalDifference(ranking, this.state.items);
      individualScores[playerId] = score;
      totalIndScore += score;
      countInd++;
    }

    const indAvg = countInd > 0 ? Math.round(totalIndScore / countInd) : 0;

    // 2. Calculate team score (for default "team" or breakout groups)
    const teamKeys = Object.keys(this.state.teamRankings);
    const mainTeamRanking = teamKeys.length > 0
      ? this.state.teamRankings[teamKeys[0]]
      : this.state.items.map((i) => i.id);

    const teamScore = calculateSurvivalDifference(mainTeamRanking, this.state.items);
    const synergyGain = indAvg - teamScore; // positive = synergy improvement!

    const teamBracket = getSurvivalBracket(teamScore);

    this.state.scores["team"] = {
      individualScore: indAvg,
      teamScore,
      synergyGain,
      bracket: teamBracket,
    };

    // Also calculate for each specific breakout group that submitted
    for (const [groupId, groupRanking] of Object.entries(this.state.teamRankings)) {
      const gScore = calculateSurvivalDifference(groupRanking, this.state.items);
      this.state.scores[groupId] = {
        individualScore: indAvg,
        teamScore: gScore,
        synergyGain: indAvg - gScore,
        bracket: getSurvivalBracket(gScore),
      };
    }

    // Calculate for each player individually
    for (const [playerId, score] of Object.entries(individualScores)) {
      this.state.scores[playerId] = {
        individualScore: score,
        teamScore,
        synergyGain,
        bracket: getSurvivalBracket(score),
      };
    }

    this.callbacks.onScoresCalculated?.(this.state.scores);
  }

  private startTimer(onComplete: () => void) {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.state.timerRemaining--;
      if (this.state.timerRemaining <= 0) {
        this.clearTimer();
        onComplete();
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public cleanup() {
    this.clearTimer();
  }
}
