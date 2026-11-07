import {
  InformationDeductionRoomState,
  DeductionGameId,
  DeductionPhase,
  CharacterRole,
} from "../types";

export interface DeductionCallbacks {
  onStateUpdate?: (state: InformationDeductionRoomState) => void;
  onSolutionChecked?: (isCorrect: boolean, officialSolution: string) => void;
}

// -------------------------------------------------------------
// 1. THE ZIN OBELISK (33 Clues Bank)
// -------------------------------------------------------------
export const ZIN_OBELISK_CLUES: string[] = [
  "Struktura nazywana Zin Obelisk jest wykonywana z kamiennych bloków o kubaturze 1 stopy sześciennej każdy.",
  "Zin Obelisk budowany jest na cześć bogini Atlantydy i jego objętość musi wynosić dokładnie 50 000 stóp sześciennych.",
  "Dni tygodnia na Atlantydzie to w kolejności: Aqueus, Neptiminus, Poseidonis, Tritonis, Thalassus.",
  "Każdy tydzień na Atlantydzie ma 5 dni.",
  "Tydzień roboczy rozpoczyna się w dniu Aqueus.",
  "Dzień Tritonis jest tradycyjnym świętem państwowym i tego dnia praca jest bezwzględnie zabroniona.",
  "Podstawową jednostką czasu pracy na Atlantydzie jest 'schrad'.",
  "Dzień roboczy trwa 9 schradów.",
  "Każdy robotnik może ułożyć maksymalnie 2 bloki kamienne w ciągu jednego schrada.",
  "Do budowy powołano 2 brygady robotników (gangi).",
  "Pierwsza brygada składa się z 9 robotników.",
  "Druga brygada również składa się z 9 robotników.",
  "Obie brygady pracują jednocześnie na placu budowy.",
  "Robotnicy obu brygad nie pracują w nocy.",
  "Każdy blok kamienny przed ułożeniem musi zostać pobłogosławiony przez kapłana.",
  "Błogosławienie odbywa się równolegle i nie opóźnia pracy robotników.",
  "W południe każdego dnia roboczego robotnicy mają 1 schrad przerwy obiadowej, podczas którego nie układa się bloków.",
  "Rzeczywisty efektywny czas układania bloków wynosi zatem 8 schradów na dzień roboczy.",
  "Do zaprawy używa się pyłu wulkanicznego dowożonego z góry Thera.",
  "Pył wulkaniczny jest dostępny w nieograniczonej ilości.",
  "Obelisk ma kształt prostopadłościanu o podstawie kwadratowej.",
  "Prace budowlane rozpoczęto oficjalnie o świcie w dniu Aqueus pierwszego tygodnia.",
  "W dniu Aqueus pierwszego tygodnia w wyniku porannej ceremonii prace ruszyły dopiero od 3. schrada dnia (stracono 2 schrady pracy).",
  "Łączna liczba bloków ułożonych przez jednego robotnika w pełnym 8-godzinnym (8-schradowym) dniu roboczym wynosi 16 bloków.",
  "Wszystkie 18 robotników z 2 brygad układa łącznie 288 bloków w standardowy pełny dzień roboczy (18 robotników * 16 bloków = 288 bloków).",
  "W pierwszym dniu Aqueus (skróconym o 2 schrady, czyli trwającym 6 schradów efektywnych) 18 robotników ułożyło: 18 * (6 * 2) = 216 bloków.",
  "Do ukończenia całego obelisku potrzeba 50 000 bloków (50 000 stóp sześciennych).",
  "Po pierwszym dniu Aqueus pozostało do ułożenia: 50 000 - 216 = 49 784 bloków.",
  "W każdym kolejnym pełnym dniu roboczym układa się 288 bloków.",
  "W każdym tygodniu są dokładnie 4 dni robocze (Aqueus, Neptiminus, Poseidonis, Thalassus), ponieważ Tritonis jest dniem wolnym.",
  "W standardowym pełnym tygodniu 4 dni roboczych układa się 4 * 288 = 1152 bloki.",
  "Po 43 pełnych tygodniach i odpowiedniej liczbie dni budowa zbliża się do końca.",
  "Dokładne obliczenie matematyczne wskazuje, że ostatni 50-tysięczny blok zostanie ułożony w dniu NEPTIMINUS.",
];

export const ZIN_OBELISK_DEBRIEF: string[] = [
  "W jaki sposób zespół zorganizował zbieranie faktów bez możliwości pokazania ekranu?",
  "Czy w grupie wyłonił się lider lub analityk, który prowadził obliczenia?",
  "Co działo się z informacjami uznanymi początkowo za nieistotne (tzw. szumem informacyjnym)?",
  "Czy ktoś posiadał kluczowy element układanki, ale nie mógł się przebić przez dyskusję?",
  "Jak radziliście sobie ze zweryfikowaniem hipotezy przed ostatecznym zatwierdzeniem?",
];

// -------------------------------------------------------------
// 2. DRACULA HAS RISEN FROM THE GRAVE
// -------------------------------------------------------------
export const DRACULA_FACTS_TEAM_1: string[] = [
  "Hrabia Dracula powraca do swojej krypty w zamku przed świtem każdego dnia.",
  "Zamek otoczony jest fosą, której most zwodzony opuszczany jest o 6:00 rano.",
  "Kołek osikowy musi zostać wbity w serce wampira w ciągu dnia, gdy spoczywa w trumnie.",
  "W piątek wieczorem Draculę widziano w okolicach wioski.",
  "Do pokonania strażników krypty potrzeba 4 zaufanych łowców.",
  "Łowcy z Zespołu 1 dysponują święconą wodą i mapą katakumb.",
  "Przejście przez zalane lochy jest możliwe tylko w godzinach odpływu w rzece górskiej (między 8:00 a 11:00 rano).",
];

export const DRACULA_FACTS_TEAM_2: string[] = [
  "Krypta Draculi zabezpieczona jest podwójnym zamkiem runicznym.",
  "Klucz do pierwszego zamka posiada Zespół 1, a klucz do drugiego Zespół 2.",
  "Jeśli oba zespoły działają w izolacji i rywalizują, pierwszy zespół dotrze do krypty najwcześniej w NIEDZIELĘ o 9:00 rano.",
  "Jeśli oba zespoły połączą siły i wyznaczą negocjatorów do wymiany kluczy w piątek wieczorem, wejście do krypty nastąpi już w SOBOTĘ o 9:00 rano!",
  "Każda kolejna noc zwłoki oznacza kolejną ofiarę wampira w wiosce.",
  "Zespół 2 dysponuje osikowymi kołkami wykonanymi z poświęconego drewna.",
];

// -------------------------------------------------------------
// 3. MURDER MYSTERY TECHSTREAM (James Mulligan)
// -------------------------------------------------------------
export const TECHSTREAM_CLUES: string[] = [
  "Dyrektor finansowy James Mulligan został znaleziony martwy w swoim gabinecie o 22:30.",
  "Przyczyną śmierci było uderzenie tępym narzędziem w tył głowy.",
  "Na podłodze gabinetu znaleziono strzęp niebieskiego materiału z garnituru z wełny czesankowej.",
  "Wiceprezes Bob Hartley jako jedyny nosił tego dnia garnitur z ciemnoniebieskiej wełny czesankowej.",
  "Główne drzwi do gabinetu Mulligana były zamknięte od wewnątrz na klucz magnetyczny o 21:45.",
  "W gabinecie znajduje się sekretne przejście łączące pokój Mulligana bezpośrednio z biurem Boba Hartleya.",
  "W komputerze Mulligana znaleziono przygotowany raport demaskujący defraudację 4 milionów złotych przez Boba Hartleya.",
  "Bob Hartley twierdził, że od 21:00 był w restauracji, ale kelner zeznał, że opuścił lokal między 21:30 a 22:15.",
];

// -------------------------------------------------------------
// 4. THE MOVIE MURDER MYSTERY (10 Characters & Clues)
// -------------------------------------------------------------
export const MOVIE_MYSTERY_ROLES: CharacterRole[] = [
  {
    id: "director",
    name: "Arthur Von Stern",
    occupation: "Reżyser Wizjoner",
    bio: "Ekscentryczny artysta, który zrobi wszystko dla arcydzieła filmowego.",
    secretObjective: "Ukryć fakt, że budżet filmu skończył się 3 tygodnie temu.",
    actionClue: "W czasie morderstwa kłócił się z producentem w przyczepie o cięcia montażowe.",
  },
  {
    id: "lead_actor",
    name: "Chad Sterling",
    occupation: "Gwiazdor Kina Akcji",
    bio: "Przystojny, narcystyczny aktor, który nie potrafi zapamiętać własnych kwestii.",
    secretObjective: "Zapewnić sobie najwięcej czasu ekranowego i wyeliminować dublera.",
    actionClue: "Widziano go, jak polerował swój złoty zegarek w garderobie.",
  },
  {
    id: "lead_actress",
    name: "Scarlett Duval",
    occupation: "Primadonna Ekranu",
    bio: "Diva o ciętym języku, rywalizująca z ofiarą o główną nagrodę festiwalu.",
    secretObjective: "Zatuszować skandal obyczajowy z udziałem reżysera.",
    actionClue: "Wychodziła z charakteryzatorni z rozmazanym makijażem o 21:15.",
  },
  {
    id: "producer",
    name: "Harvey Gold",
    occupation: "Producent Finansowy",
    bio: "Liczy każdy grosz i nie cofa się przed szantażem, by zamknąć produkcję w terminie.",
    secretObjective: "Wymusić wypłatę z ubezpieczenia na wypadek śmierci członka obsady.",
    actionClue: "Podpisywał podejrzane dokumenty w limuzynie na parkingu studia.",
  },
  {
    id: "stunt_coordinator",
    name: "Brutus 'Rocky' Kowalski",
    occupation: "Koordynator Kaskaderów",
    bio: "Cichy profesjonalista, znający tajniki każdego rekwizytu i mechanizmu.",
    secretObjective: "Odkryć, kto uszkodził liny asekuracyjne na planie.",
    actionClue: "Zauważył brak rekwizytowego rewolweru z magazynu broni o 20:45.",
  },
  {
    id: "co_star",
    name: "Julian Cross",
    occupation: "Wieczny Drugoplanowiec (ZABÓJCA)",
    bio: "Frustrat, który przez 15 lat grał jedynie cienie i służących. Ofiara odebrała mu rolę życia.",
    secretObjective: "Zabić ofiarę przed podpisaniem 5-letniego kontraktu gwiazdorskiego!",
    actionClue: "Ukrył fiolkę z trucizną w futerale na rekwizyty i podmienił kieliszek szampana.",
  },
];

export class InformationDeductionSession {
  public roomCode: string;
  public state: InformationDeductionRoomState;
  private callbacks: DeductionCallbacks;

  constructor(
    roomCode: string,
    gameId: DeductionGameId = "ZIN_OBELISK",
    callbacks: DeductionCallbacks = {}
  ) {
    this.roomCode = roomCode;
    this.callbacks = callbacks;
    this.state = this.buildInitialState(gameId);
  }

  private buildInitialState(gameId: DeductionGameId): InformationDeductionRoomState {
    switch (gameId) {
      case "ZIN_OBELISK":
        return {
          roomCode: this.roomCode,
          gameId: "ZIN_OBELISK",
          phase: "INVESTIGATION",
          title: "Zin Obelisk (Starożytna Atlantyda)",
          briefing:
            "W starożytnej Atlantydzie wznoszony jest monumentalny Zin Obelisk. Waszym zadaniem zespołowym jest wydedukować, W KTÓRYM DNIU TYGODNIA ukończono budowę.",
          ruleWarning:
            "ZASADA BEZWZGLĘDNA: Nie pokazuj nikomu swojego ekranu! Wszystkie poszlaki wolno przekazywać wyłącznie głosem na Discordzie lub Google Meet.",
          clueCards: {},
          officialSolution: "Neptiminus",
          rationaleSteps: [
            "Objętość obelisku: 50 000 stóp sześciennych (50 000 bloków po 1 stopie).",
            "Dni tygodnia: Aqueus, Neptiminus, Poseidonis, Tritonis (święto - wolne!), Thalassus (4 dni robocze/tydzień).",
            "2 brygady po 9 robotników = 18 robotników układających po 2 bloki na godzinę (schrad).",
            "W pierwszym dniu Aqueus praca trwała 6 godzin = 216 bloków.",
            "W kolejnych dniach pełnych praca trwa 8 godzin = 288 bloków dziennie.",
            "Po 172 dniach roboczych (dokładnie 43 pełne tygodnie + 1 dzień Aqueus), ostatni blok zostaje ułożony w dniu NEPTIMINUS drugiego dnia 44. tygodnia!",
          ],
          debriefingQuestions: ZIN_OBELISK_DEBRIEF,
          notes: "",
        };

      case "DRACULA":
        return {
          roomCode: this.roomCode,
          gameId: "DRACULA",
          phase: "INVESTIGATION",
          title: "Dracula powrócił z grobu",
          briefing:
            "Dwie grupy śmiałków posiadają odmienne arkusze faktów. Czy zdecydujecie się konkurować o chwałę, czy wyznaczycie negocjatorów i połączycie klucze?",
          ruleWarning:
            "Przekazujcie informacje tylko przez wyznaczonych negocjatorów! Działanie w pojedynkę opóźnia zwycięstwo.",
          clueCards: {},
          teamFactSheets: {
            "team-1": {
              title: "Arkusz Zespołu 1 (Łowcy Wschodu)",
              facts: DRACULA_FACTS_TEAM_1,
            },
            "team-2": {
              title: "Arkusz Zespołu 2 (Strażnicy Zakonu)",
              facts: DRACULA_FACTS_TEAM_2,
            },
          },
          officialSolution: "Sobota 9:00 rano (przy pełnej kooperacji) / Niedziela 9:00 rano (przy rywalizacji)",
          rationaleSteps: [
            "W trybie rywalizacji zespoły nie ufają sobie i tracą czas na forsowanie zamka bez drugiego klucza (Niedziela 9:00).",
            "W trybie negocjacji i wymiany kluczy krypta zostaje otwarta w pierwszym możliwym oknie odpływu (Sobota 9:00).",
          ],
          debriefingQuestions: [
            "Czy traktowaliście drugi zespół jak rywala czy jak partnera?",
            "Co powstrzymywało Was przed natychmiastowym ujawnieniem kluczowych faktów negocjatorom?",
            "Jak w codziennej pracy firmy silosy między działami opóźniają realizację celów?",
          ],
          notes: "",
        };

      case "MURDER_TECHSTREAM":
        return {
          roomCode: this.roomCode,
          gameId: "MURDER_TECHSTREAM",
          phase: "INVESTIGATION",
          title: "Zagadka TechStream (Śmierć Jamesa Mulligana)",
          briefing:
            "Dyrektor finansowy giganta IT nie żyje. Poszlaki zostały rozdzielone między pracowników. Kto dokonał zbrodni i jaki był motyw?",
          ruleWarning:
            "Nie ujawniaj swoich poszlak w formie tekstu ani zrzutów ekranu. Przekazuj fakty wyłącznie mową.",
          clueCards: {},
          officialSolution: "Bob Hartley (Wiceprezes)",
          rationaleSteps: [
            "Niebieski skrawek garnituru z wełny czesankowej na miejscu zbrodni pasuje wyłącznie do Boba Hartleya.",
            "Sekretne przejście łączyło gabinet ofiary bezpośrednio z biurem Boba Hartleya.",
            "Motyw: Mulligan przygotował raport ujawniający 4 miliony złotych zdefraudowane przez Hartleya.",
            "Alibi Hartleya zostało obalone przez zeznania kelnera w restauracji.",
          ],
          debriefingQuestions: [
            "Która poszlaka okazała się decydująca?",
            "Jakie fałszywe tropy pojawiły się podczas śledztwa?",
          ],
          notes: "",
        };

      case "MOVIE_MYSTERY":
        return {
          roomCode: this.roomCode,
          gameId: "MOVIE_MYSTERY",
          phase: "INVESTIGATION",
          title: "Tajemnica na Planie Filmowym",
          briefing:
            "Podczas kręcenia finałowej sceny doszło do morderstwa. Każdy z Was wciela się w postać z planu i ma swój sekret oraz alibi!",
          ruleWarning:
            "Odgrywajcie swoje role! Nie czytajcie na głos swoich sekretnych celów, lecz brońcie się argumentami.",
          clueCards: {},
          officialSolution: "Julian Cross (Wieczny Drugoplanowiec)",
          rationaleSteps: [
            "Julian Cross przez lata czuł się niedoceniany i zepchnięty na boczny tor.",
            "Podmienił rekwizyt i wlał truciznę do kieliszka szampana.",
          ],
          debriefingQuestions: [
            "Kto najlepiej odgrywał swoją postać?",
            "Jakie motywy poboczne najbardziej zmyliły śledczych?",
          ],
          notes: "",
        };
    }
  }

  public setGame(gameId: DeductionGameId) {
    this.state = this.buildInitialState(gameId);
    this.callbacks.onStateUpdate?.(this.state);
  }

  public dealCards(playerIds: string[]) {
    if (playerIds.length === 0) return;

    if (this.state.gameId === "ZIN_OBELISK") {
      const clues = [...ZIN_OBELISK_CLUES];
      // Shuffle clues randomly (Fisher-Yates)
      for (let i = clues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [clues[i], clues[j]] = [clues[j], clues[i]];
      }

      this.state.clueCards = {};
      playerIds.forEach((pid) => {
        this.state.clueCards[pid] = [];
      });

      // Deal clues evenly across all players
      clues.forEach((clueText, index) => {
        const targetPlayerId = playerIds[index % playerIds.length];
        this.state.clueCards[targetPlayerId].push({
          id: `zin_${index + 1}`,
          text: clueText,
          assignedPlayerId: targetPlayerId,
        });
      });
    } else if (this.state.gameId === "MURDER_TECHSTREAM") {
      const clues = [...TECHSTREAM_CLUES];
      this.state.clueCards = {};
      playerIds.forEach((pid) => {
        this.state.clueCards[pid] = [];
      });
      clues.forEach((clueText, index) => {
        const targetPlayerId = playerIds[index % playerIds.length];
        this.state.clueCards[targetPlayerId].push({
          id: `tech_${index + 1}`,
          text: clueText,
          assignedPlayerId: targetPlayerId,
        });
      });
    } else if (this.state.gameId === "MOVIE_MYSTERY") {
      // Assign roles to players
      this.state.roles = {};
      playerIds.forEach((pid, index) => {
        const role = MOVIE_MYSTERY_ROLES[index % MOVIE_MYSTERY_ROLES.length];
        this.state.roles![pid] = { ...role, assignedPlayerId: pid };
      });
    }

    this.callbacks.onStateUpdate?.(this.state);
  }

  public designateNegotiator(playerId: string) {
    if (!this.state.negotiators) this.state.negotiators = [];
    if (!this.state.negotiators.includes(playerId)) {
      this.state.negotiators.push(playerId);
      this.callbacks.onStateUpdate?.(this.state);
    }
  }

  public updateNotes(notes: string) {
    this.state.notes = notes;
    this.callbacks.onStateUpdate?.(this.state);
  }

  public submitSolution(solution: string): boolean {
    this.state.submittedSolution = solution;
    const cleanSub = solution.toLowerCase().trim();
    const cleanSol = this.state.officialSolution.toLowerCase().trim();
    const isCorrect = cleanSub.includes(cleanSol) || cleanSol.includes(cleanSub);
    this.state.isSolutionCorrect = isCorrect;
    this.state.phase = "SOLUTION_REVEAL";

    this.callbacks.onSolutionChecked?.(isCorrect, this.state.officialSolution);
    this.callbacks.onStateUpdate?.(this.state);
    return isCorrect;
  }

  public setPhase(phase: DeductionPhase) {
    this.state.phase = phase;
    this.callbacks.onStateUpdate?.(this.state);
  }
}
