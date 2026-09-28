# THOSFLUID — Especificació funcional i tècnica

**Projecte:** aplicació independent de la suite Tecno-Apps  
**Repositori de destinació:** [dep-tecno/THOSAPPS](https://github.com/dep-tecno/THOSAPPS)  
**Web de destinació:** [tecno-apps.cat](https://tecno-apps.cat/)  
**Idioma:** català a tota la interfície i la documentació funcional  
**Públic:** ESO, batxillerat i formació professional  
**Estat:** especificació per començar la implementació; THOSFLUID encara no està publicada

**Font única del projecte:** el repositori `dep-tecno/THOSAPPS` a GitHub. L'especificació `THOSFLUID.md`, el codi, els símbols propis, els circuits d'exemple i les versions lliurades han de quedar versionats en aquest repositori.

## 1. Propòsit i decisió de producte

THOSFLUID és un simulador educatiu web de **pneumàtica i electropneumàtica**. L'alumne col·loca components en un llenç, connecta conductes i cables, prem **Simula** i observa què passa: quines línies tenen pressió, quines descarreguen, quines vàlvules canvien de posició, quins cilindres es mouen i quan s'activen els finals de cursa.

El motor resol **estats lògics i funcionals**, sense calcular magnituds físiques. L'objectiu és muntar un circuit dels apunts, comprovar-ne el funcionament i entendre la cadena de causes. THOSFLUID és una aplicació autònoma dins de Tecno-Apps, amb la mateixa manera d'accedir-hi i navegar-hi que la resta de la suite.

### Objectius

- Construir i modificar esquemes amb símbols funcionals, ports i connexions.
- Simular accionaments manuals, mecànics, pneumàtics i elèctrics, incloses seqüències automàtiques senzilles.
- Fer visible l'estat de cada connexió i component, amb explicacions breus dels canvis i dels errors.
- Permetre que cada alumne descarregui el seu circuit en un JSON versionat i l'obri de nou des del dispositiu per continuar treballant. Oferir, si ho activa, una única còpia local de recuperació de l'últim circuit.
- Separar el motor de la interfície i preparar-lo per a nous dominis de fluids en el futur.

### Fora de l'abast

No s'hi calculen bar, cabals reals, forces, diàmetres, velocitats físiques, pèrdues de càrrega, consum, termodinàmica ni dinàmica de fluids (CFD). La regulació de cabal només modifica la **categoria visual** de moviment: tancat, poc, mitjà o obert. Tampoc s'implementen inicialment hidràulica, motors pneumàtics, buit, compressió, avaries físiques, PLC avançats, circuits industrials complexos ni una plataforma de teoria o avaluació.

## 2. Integració concreta amb Tecno-Apps

El repositori actual publica pàgines HTML a l'arrel. `index.html` conté la navegació i les targetes de les eines; `thosdruino.html` és una aplicació en una sola pàgina; `thosvincle.html` és una pàgina d'entrada que integra `thosvincle-app.html` en un `iframe`. `sitemap.xml` enumera URL públiques. **Abans de programar, Codex ha de tornar a inspeccionar el repositori**, perquè la seva estructura pot haver canviat.

Per a THOSFLUID, la ruta pública prevista és **`https://tecno-apps.cat/thosfluid.html`**. Fer servir `thosfluid.html` com a pàgina d'entrada amb la capçalera i la navegació compartides. La superfície de l'editor pot viure en `thosfluid-app.html` i en mòduls/recursos propis, mantenint els camins relatius compatibles amb l'allotjament estàtic. Aquesta separació segueix el patró existent de THOSVINCLE; si l'estat real del repositori ofereix una convenció millor, conservar la ruta pública i adaptar la implementació.

Quan l'app estigui llesta per publicar:

1. Afegir una targeta **activa** de THOSFLUID a `index.html`, amb imatge o SVG propi, descripció en català i enllaç a `thosfluid.html`.
2. Afegir THOSFLUID als menús compartits de les pàgines que el repositori mantingui sincronitzades, amb l'estat actiu a la seva pàgina.
3. Afegir `https://tecno-apps.cat/thosfluid.html` a `sitemap.xml`, d'acord amb el domini públic vigent.
4. Respectar els estils, la identitat visual, l'autoria i la llicència del repositori. Crear símbols originals o comprovar-ne les llicències abans d'incorporar recursos externs.
5. Comprovar al navegador els enllaços, l'obertura directa de la ruta pública i la càrrega dels recursos. La publicació requereix una tasca explícita d'implementació i desplegament; aquest document no la duu a terme.

No afegir una targeta «Pròximament» com a substitut de l'app funcional. No reescriure altres simuladors per integrar THOSFLUID.

### Còpies i historial a GitHub

- Incorporar aquest document com a `THOSFLUID.md` al repositori, perquè Codex i qualsevol col·laborador parteixin de la mateixa especificació.
- Mantenir al repositori tots els fitxers necessaris per reproduir l'app i tots els circuits de referència. Cap còpia local ha de ser l'única versió d'una entrega acabada.
- Fer servir l'historial de commits de GitHub per conservar les versions. Per a canvis grans, treballar en una branca i obrir una sol·licitud de canvis; crear etiquetes de versió quan hi hagi una entrega estable.
- Tecno-Apps es publica des del mateix projecte de GitHub. Després de cada publicació, comprovar que la versió visible a `tecno-apps.cat` correspon al contingut versionat.
- Els circuits personals que l'alumnat creï amb l'editor són dades d'usuari, diferents de les còpies del projecte. Cada alumne se'n descarrega el fitxer JSON i el conserva al seu dispositiu per continuar més endavant. Opcionalment, el navegador pot mantenir una sola còpia local de recuperació de l'últim circuit. L'app no els desa en cap servidor ni els puja a GitHub. Només els circuits d'exemple preparats per a l'app formen part del projecte versionat.

## 3. Ús educatiu

| Nivell | Circuits i idees principals |
| --- | --- |
| ESO | Font, vàlvula 3/2, polsador i cilindre de simple efecte; pressió, escapament, avançament i retorn. |
| Batxillerat | Cilindres de doble efecte, distribuïdors 4/2 i 5/2, regulació qualitativa, lògica pneumàtica i automatismes senzills. |
| FP | Pilotatge, finals de cursa, temporitzadors, relés, sensors, electrovàlvules i seqüències. |

Els nivells orienten filtres i exemples, però no han de bloquejar components. Es poden oferir circuits d'exemple petits, amb opció de començar des d'un llenç buit. Les explicacions han de ser contextuals i breus.

## 4. Biblioteca de components

### Pneumàtica V1

| Família | Components i comportament necessari |
| --- | --- |
| Alimentació | Font d'aire i unitat de manteniment; originen una pressió lògica disponible. |
| Actuadors | Cilindre de simple efecte amb retorn per molla i de doble efecte, amb posicions extremes i moviment visible. |
| Distribució | Vàlvules 2/2, 3/2, 4/2 i 5/2; posició de repòs, connexions internes per posició i variants normalment obertes/tancades quan pertoqui. 5/3 opcional després del MVP. |
| Accionaments | Polsador, palanca, pedal, rodolí/èmbol mecànic, molla, pilotatge pneumàtic; caràcter momentani o mantingut segons el model. |
| Regulació | Regulador de cabal qualitatiu i variant amb antiretorn, amb sentit regulat explícit. |
| Pas i lògica | Antiretorn, vàlvules AND i OR pneumàtiques. |
| Seqüència | Temporitzador pneumàtic de retard discret; finals de cursa vinculats als extrems dels cilindres. |

Els símbols s'han de dibuixar de manera coherent i llegible. El seu funcionament prové de la definició de ports i posicions, mai de la geometria del dibuix.

### Electricitat i electropneumàtica V1

- Font i retorn de control elèctric, representats com a estat de continuïtat binari.
- Polsadors normalment oberts i normalment tancats, i interruptors mantinguts.
- Bobines i contactes de relé associats per referència.
- Sensors i finals de cursa elèctrics vinculats als actuadors.
- Solenoides i electrovàlvules monoestables o biestables, segons el model concret.
- Cables elèctrics visualment diferents dels conductes pneumàtics.

L'electrovàlvula té una part elèctrica que determina l'accionament i una part pneumàtica que comunica els ports de treball. Els dominis no s'han de barrejar en una mateixa connexió.

## 5. Editor i modes

### Mode **Edita**

- Llenç amb quadrícula discreta, desplaçament, zoom i ajust al contingut.
- Biblioteca amb cerca i categories; arrossegar o inserir un component amb teclat.
- Seleccionar, moure, duplicar, girar quan el símbol ho admeti i esborrar.
- Crear connexions des d'un port fins a un altre; mostrar nom, funció i medi de cada port. Permetre desfer una connexió i editar-ne el recorregut visual.
- Desfés/refés per a totes les operacions d'edició.
- Panell de propietats: variant del component, configuració de repòs, sentit d'un regulador, referències de bobina/relé i nom opcional.
- **Desa** descarrega un fitxer JSON al dispositiu de l'alumne. **Obre** selecciona un fitxer JSON del dispositiu i el carrega directament al navegador; no l'envia a cap servidor. Si és viable amb la tecnologia escollida, permetre també exportar l'esquema com a SVG o PNG.
- **Còpia de recuperació:** opció desactivada per defecte que l'alumne pot activar o desactivar. Quan està activada, l'app actualitza **una única còpia de l'últim circuit** a l'emmagatzematge local d'aquell navegador després de cada operació d'edició confirmada. La còpia nova substitueix l'anterior; no es crea un historial. En reobrir la pàgina després d'un tancament accidental, oferir **Recupera l'últim circuit** abans de substituir el circuit actual. Incloure **Esborra la còpia de recuperació**; desactivar l'opció també esborra la còpia existent.
- Avisar abans de perdre canvis no desats.

**Flux per reprendre la feina:** l'alumne munta el circuit → prem **Desa** → conserva el JSON descarregat → en una altra sessió obre THOSFLUID → prem **Obre** i selecciona aquell JSON → continua editant-lo. En tornar a desar, es descarrega una nova còpia actualitzada. La còpia de recuperació és una ajuda per al tancament accidental en el mateix navegador i dispositiu; es pot perdre si s'esborren les dades del navegador i no substitueix el JSON descarregat. Aquest flux no depèn de comptes, servidors ni sincronització amb GitHub.

### Mode **Simula**

- Iniciar, aturar, reiniciar i avançar pas a pas.
- Prémer i deixar anar comandaments momentanis; commutar interruptors mantinguts.
- Ressaltar conductes amb pressió, conductes que descarreguen i cables energitzats; animar els cilindres.
- Mostrar la posició actual de cada vàlvula, el motiu de l'accionament i els finals de cursa actius.
- Mostrar un avís comprensible si el circuit no convergeix o té connexions incompatibles.
- Evitar edicions involuntàries mentre s'executa; el canvi de mode no ha d'alterar silenciosament el fitxer desat.

**Textos visibles inicials:** `Edita`, `Simula`, `Atura`, `Reinicia`, `Pas a pas`, `Desa`, `Obre`, `Exporta`, `Desfés`, `Refés`, `Activa la còpia de recuperació`, `Recupera l'últim circuit`, `Esborra la còpia de recuperació`, `Sense pressió`, `Amb pressió`, `Escapament`, `Circuit incomplet`. Els identificadors interns del codi poden ser en anglès, però tota la interfície, els errors, la biblioteca, els exemples i l'ajuda han de ser en català. Centralitzar les cadenes per facilitar una traducció futura, sense afegir un selector d'idioma al MVP.

## 6. Model de dades i persistència

El **circuit desat** conté components, connexions, propietats i vista. L'**estat de simulació** és temporal: posicions, senyals, línies actives, pas actual i avisos. Reiniciar la simulació no modifica el circuit.

```json
{
  "format": "thosfluid-circuit",
  "version": 1,
  "metadata": { "name": "Circuit nou", "createdAt": "2026-09-28T00:00:00Z" },
  "components": [
    {
      "id": "c1",
      "type": "pneumatic.source",
      "typeVersion": 1,
      "position": { "x": 80, "y": 120 },
      "rotation": 0,
      "properties": {}
    },
    {
      "id": "c2",
      "type": "pneumatic.valve.3_2",
      "typeVersion": 1,
      "position": { "x": 250, "y": 120 },
      "rotation": 0,
      "properties": { "normal": "NC", "actuator": "pushbutton", "return": "spring" }
    },
    {
      "id": "c3",
      "type": "pneumatic.cylinder.single",
      "typeVersion": 1,
      "position": { "x": 440, "y": 120 },
      "rotation": 0,
      "properties": {}
    }
  ],
  "connections": [
    {
      "id": "n1",
      "medium": "pneumatic",
      "endpoints": [
        { "componentId": "c1", "portId": "P" },
        { "componentId": "c2", "portId": "P" }
      ],
      "route": []
    },
    {
      "id": "n2",
      "medium": "pneumatic",
      "endpoints": [
        { "componentId": "c2", "portId": "A" },
        { "componentId": "c3", "portId": "A" }
      ],
      "route": []
    }
  ],
  "view": { "zoom": 1, "pan": { "x": 0, "y": 0 } }
}
```

L'exemple il·lustra el format; els noms exactes dels tipus i les propietats s'han de fixar al registre de components. El port `R` de la 3/2 pot quedar obert a l'ambient si la seva definició l'identifica com a escapament. Els fitxers d'exemple lliurats amb l'app han de validar-se amb l'esquema definit.

### Contractes

- `ComponentDefinition`: identificador de tipus estable, versió, família, ports, propietats permeses, posicions de vàlvula, regla de transició i representació visual.
- `ComponentInstance`: identificador únic, tipus, posició, rotació i propietats validades.
- `PortDefinition`: identificador, medi (`pneumatic` o `electrical`), funció (`P`, `A`, `B`, `R`, `S`, pilotatge, bobina, contacte…), tipus d'unió i capacitat.
- `Connection`: identificador, medi, extrems i recorregut dibuixat. En una intersecció de línies **no** hi ha connexió si no s'ha creat un node/unió explícit.
- `RuntimeState`: posicions de vàlvules i cilindres, pressió/escapament per xarxa i port, electricitat activa, entrades manuals, temporitzadors, pas lògic i avisos.

Els valors de codi poden ser `none/present`, `none/exhaust`, `retracted/moving_forward/extended/moving_backward` i `deenergized/energized`. Són categories discretes. Les etiquetes que veu l'alumne han de ser en català i no han de suggerir mesures físiques.

El JSON necessita un `version` explícit, validador d'importació i migracions quan s'ampliï l'esquema. No serialitzar funcions, referències al DOM ni objectes circulars. El circuit obert viu en la memòria de la sessió del navegador; **Desa** genera una descàrrega local i **Obre** llegeix un fitxer local. Si s'activa la recuperació, desar només l'última definició del circuit en un registre local del navegador (per exemple, IndexedDB), amb escriptures agrupades després de les edicions; no desar-hi l'estat temporal de la simulació. En obrir la pàgina, oferir la restauració, sense fer-la silenciosament. Cap circuit de l'alumnat no es desa en un servidor ni es transmet al repositori.

## 7. Arquitectura del motor

1. **Model:** circuit immutable i definicions de components.
2. **Registre:** catàleg de tipus i regles de cada component; evita un únic bloc de condicionals extens.
3. **Graf de connexions:** agrupa ports comunicats, separa medi pneumàtic i elèctric, i distingeix unions reals dels creuaments visuals.
4. **Avaluadors de domini:** regles pures per a electricitat i pneumàtica. Definir una interfície extensible per a futurs dominis; no implementar hidràulica ara.
5. **Planificador:** avança en passos discrets fins a un punt estable o fins a detectar oscil·lació/límit.
6. **Adaptador d'esdeveniments:** converteix gestos de l'usuari i ticks lògics en entrades de simulació.
7. **Vista:** dibuixa una instantània de l'estat; l'animació visual no decideix el comportament del circuit.

Per a cada posició d'un distribuïdor, una taula explícita de parelles de ports indica les comunicacions internes. Exemple d'una 5/2: una posició pot comunicar `P–A` i `B–S`; l'altra, `P–B` i `A–R`. Els noms dels dos escapaments i l'orientació del símbol s'han de mantenir coherents a la definició concreta. Un port de pilotatge és de control, no és una cambra de treball.

### Algoritme de referència

```text
simula(circuit, entrades, estatAnterior):
    graf = construeixGrafTipat(circuit)
    problemes = valida(graf, circuit)
    estat = iniciaOCopia(estatAnterior, entrades)
    signaturesVistes = conjuntBuit()

    per pas de 1 fins a MAX_PASSOS_PER_TICK:
        signatura = serialitzaEstatCanonic(estat)
        si signatura pertany a signaturesVistes:
            retorna avisa(estat, "El circuit oscil·la", problemes)
        afegeix(signatura, signaturesVistes)

        seguent = copia(estat)
        avaluaXarxesElectriques(graf, seguent)
        avaluaRelesSolenoidesIPilotatges(seguent)
        actualitzaPosicionsDeValvules(graf, seguent)
        propagaPressioIEscapament(graf, seguent)
        actualitzaCilindresPerPassosDiscrets(seguent)
        actualitzaFinalsDeCursa(seguent)
        actualitzaTemporitzadorsPerTicksLogics(seguent)

        si estatsEquivalents(seguent, estat):
            retorna marcaEstable(seguent, problemes)
        estat = seguent

    retorna avisa(estat, "No s'ha assolit un estat estable", problemes)
```

La signatura ha de tenir un ordre estable per identificador i contenir tots els estats que afecten les regles. Limitar els passos i detectar signatures repetides per impedir bucles infinits i bloquejos de la interfície. Un circuit amb oscil·lació s'atura amb un avís i conserva una instantània inspeccionable. El temps dels temporitzadors es representa amb ticks lògics reproduïbles; la durada de l'animació és independent.

### Semàntica funcional mínima

- Una font activa posa pressió a la xarxa compatible; una línia sense font no la crea.
- El pas a escapament descarrega; si una xarxa queda simultàniament alimentada i comunicada a escapament, el motor ha de marcar un **conflicte de model** i explicar-lo, en lloc de fingir un resultat físic.
- Una vàlvula només comunica els ports definits per la seva posició actual. Una molla porta a la posició de repòs quan cessa l'ordre; una vàlvula biestable conserva la darrera posició fins a l'ordre contrària.
- El cilindre de simple efecte avança amb pressió a la cambra i retorna per molla quan descarrega. El de doble efecte avança si una cambra rep pressió i l'altra pot descarregar; retrocedeix amb les condicions inverses. En altres casos manté l'estat o aplica la regla de repòs definida pel model.
- Un final de cursa canvia d'estat només quan s'arriba a l'extrem corresponent; no durant la interpolació visual.
- AND activa la sortida amb les dues entrades; OR amb qualsevol de les dues.
- Un regulador `tancat` impedeix el pas en el sentit configurat. `poc`, `mitjà` i `obert` permeten el pas i ajusten només l'animació qualitativa.
- Un contacte NO/NC modifica la continuïtat elèctrica. La bobina d'un relé governa els contactes amb la mateixa referència; un solenoide actiu governa la posició de l'electrovàlvula vinculada.
- Si hi ha ordres oposades simultànies i el model de vàlvula no defineix prioritat, avisar del conflicte i aplicar una regla documentada i determinista.

## 8. Validació i tractament d'errors

L'editor pot contenir esquemes incomplets; la validació no ha de destruir la feina. Comprovar identificadors duplicats, tipus desconeguts, components o ports inexistents, medis incompatibles, ports ocupats indegudament, extrems insuficients, referències de relé/bobina sense parella i fonts inexistents. Avisar de connexions obertes rellevants i de circuits que no arribin a un estat estable. Cada avís ha d'indicar el component o port afectat i permetre localitzar-lo al llenç.

La validació d'importació ha de rebutjar JSON malformat o amb versió no compatible amb un missatge clar, sense executar codi ni modificar el circuit obert. Els canvis de fitxer i l'esborrament de tot el circuit requereixen confirmació si hi ha modificacions no desades.

## 9. Accessibilitat i disposició

La disposició de referència és una barra superior amb nom del circuit i controls, una biblioteca lateral, el llenç central i un panell contextual de propietats/estat. El treball de dibuix es prioritza en ordinador d'aula; en pantalles petites s'ha de poder consultar l'esquema, operar la simulació i fer edicions bàsiques sense exigir un arrossegament precís.

Fer servir colors **i també** patrons, icones o text per diferenciar pressió, escapament, línia sense pressió, cable actiu i components accionats. El moviment del cilindre ha de respectar `prefers-reduced-motion`, amb pausa d'animació. Proporcionar navegació per teclat, ordre de focus coherent, botons amb nom accessible, contrast suficient i avisos de simulació llegibles pels lectors de pantalla.

## 10. Deu circuits de referència i criteris d'acceptació

Cada cas ha de tenir un circuit JSON complet i l'estat esperat abans i després de cada acció. Han de servir de referència durant el desenvolupament del motor i de revisió visual de l'app.

| Núm. | Circuit | Resultat esperat |
| --- | --- | --- |
| 1 | Font → 3/2 NC amb polsador i molla → cilindre de simple efecte | Prémer: `P–A`, avançament. Deixar anar: `A–R`, escapament i retorn. |
| 2 | Font → 5/2 biestable → cilindre de doble efecte | Ordre A: avançament; ordre B: retrocés; en cada estat es mostren les dues comunicacions internes correctes. |
| 3 | 5/2 monoestable i cilindre de doble efecte | L'accionament canvia la posició; en deixar-lo anar la molla retorna la vàlvula i el cilindre segons els ports connectats. |
| 4 | 4/2 i cilindre de doble efecte | Les dues posicions inverteixen alimentació i descàrrega de les cambres. |
| 5 | Cilindre i final de cursa mecànic | El final de cursa s'activa només en arribar a l'extrem configurat i es desactiva en sortir-ne. |
| 6 | Seqüència pneumàtica `A+ → B+ → B− → A−` amb pilotatges/finals | Es compleix l'ordre previst sense avançaments anticipats ni oscil·lació persistent. |
| 7 | Regulador de cabal en un sentit | Tancat bloqueja; poc/mitjà/obert canvien només la categoria de l'animació. |
| 8 | Vàlvules pneumàtiques AND i OR | AND exigeix dues entrades; OR en necessita una. L'estat visual coincideix amb el motor. |
| 9 | Polsador elèctric → relé/solenoide → electrovàlvula → cilindre | La continuïtat elèctrica acciona la vàlvula i després la xarxa pneumàtica; en treure el senyal s'aplica el retorn o la memòria definits. |
| 10 | Inici manual, temporitzador i fase automàtica | L'ordre inicial desencadena una única transició després dels ticks previstos; aturar/reiniciar restaura l'estat inicial. |

**Criteri comú:** resultat determinista, connexions i símbols visualment coherents amb l'estat intern, avís explícit davant d'un conflicte o bucle, cap bloqueig de la pàgina, i conservació exacta de components, propietats, connexions i vista en descarregar el JSON i tornar-lo a obrir en una sessió nova. Amb la còpia de recuperació activada, tancar i reobrir la pàgina ofereix l'últim circuit; desactivada, no crea cap còpia nova; esborrar-la la fa desaparèixer. La prova del flux ha de confirmar que no hi ha cap petició de xarxa que enviï el circuit a un servidor. Les comprovacions del motor no substitueixen la revisió visual ni la verificació de la ruta pública quan es publiqui.

## 11. Pla de desenvolupament

### Fase 0 — Integració i editor

Revisar el repositori real; crear l'entrada THOSFLUID i el llenç independent, biblioteca, selecció, connexions, desfer/refés i JSON versionat. Mantenir la ruta `thosfluid.html`. La targeta pública de l'índex s'activa quan l'app funcional estigui preparada.

### Fase 1 — MVP pneumàtic

Font, cilindres simple i doble, 3/2 i 5/2, polsador, molla, motor discret, pressió/escapament visibles i controls **Edita/Simula/Atura/Reinicia/Pas a pas**. Cobrir els circuits 1–3.

### Fase 2 — Lògica i seqüències

2/2 i 4/2, accionaments mecànics, pilotatge, finals de cursa, antiretorn, regulador qualitatiu, AND/OR i temporitzador. Cobrir els circuits 4–8 i 10.

### Fase 3 — Electropneumàtica

Xarxa elèctrica, polsadors/interruptors, contactes, relés, sensors, bobines, solenoides i electrovàlvules. Cobrir el circuit 9 i variants amb dos cilindres.

### Fase 4 — Acabat

Polir símbols i ajudes contextuals, accessibilitat, pantalles petites, exportació gràfica si escau, migracions de JSON i rendiment amb desenes de components. Decidir una eventual especificació d'hidràulica en una fase posterior.

## 12. Estructura suggerida de fitxers

Adaptar els noms i el sistema de mòduls a l'estat del repositori. Aquesta proposta manté els punts d'entrada a l'arrel, com les aplicacions actuals:

```text
THOSAPPS/
  index.html                 # navegació i targeta THOSFLUID
  sitemap.xml                # URL pública de THOSFLUID
  thosfluid.html             # entrada pròpia i capçalera compartida
  thosfluid-app.html         # editor i vista de simulació
  thosfluid.svg              # imatge de la targeta, si s'escull SVG
  thosfluid/
    ui/                      # llenç, biblioteca, propietats, controls
    model/                   # components, ports, connexions i serialització
    engine/                  # graf, planificador, pneumàtica i electricitat
    fixtures/                # deu circuits de referència en JSON
    styles/                  # estils propis compatibles amb la suite
```

Si el repositori continua fent servir pàgines HTML autònomes, THOSFLUID pot tenir mòduls JavaScript carregats amb camins relatius sense exigir un servidor d'aplicacions. Cal inspeccionar les dependències reals abans de triar una llibreria d'editor o afegir un procés de compilació.

## 13. Instruccions de partida per a Codex

1. Obre el repositori `dep-tecno/THOSAPPS` i comprova l'estat actual d'`index.html`, la navegació de `thosdruino.html` i `thosvincle.html`, `sitemap.xml`, els estils i els requisits de desplegament.
2. Implementa primer el circuit mínim de la fase 1 amb regles pures i dades versionades. Revisa que el polsador, la molla, la 3/2 i el cilindre de simple efecte funcionin de cap a cap abans d'ampliar el catàleg.
3. Fes que l'editor i la simulació comparteixin només el model de circuit; el motor no ha de dependre del DOM ni dels dibuixos SVG.
4. Documenta la posició de repòs, les connexions internes, la memòria i les ordres simultànies de cada vàlvula concreta. En cas de dubte, deixa una decisió explícita al registre del component.
5. Mantén en català tot el text visible i tots els exemples; revisa els accents i l'ús coherent de «vàlvula», «cilindre», «conducte», «escapament» i «final de cursa».
6. Verifica per separat la lògica dels circuits, la visualització al navegador i, quan s'autoritzi la publicació, la ruta pública de Tecno-Apps. Informa de què s'ha comprovat en cada etapa.

## 14. Fonts de l'estructura de la suite

- [Repositori THOSAPPS](https://github.com/dep-tecno/THOSAPPS)
- [Índex i targetes](https://github.com/dep-tecno/THOSAPPS/blob/main/index.html)
- [THOSDRUINO](https://github.com/dep-tecno/THOSAPPS/blob/main/thosdruino.html)
- [Patró de pàgina d'entrada de THOSVINCLE](https://github.com/dep-tecno/THOSAPPS/blob/main/thosvincle.html)
- [Mapa del web](https://github.com/dep-tecno/THOSAPPS/blob/main/sitemap.xml)

Estructura consultada el **28 de setembre de 2026**. És una referència per implementar THOSFLUID; cal tornar-la a comprovar en començar a treballar sobre el repositori.
