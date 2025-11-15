/**
 * Python Interpreter App for Maailmantutkija
 * Uses Skulpt to provide browser-based Python execution
 * Educational focus with Finnish localization
 */

class PythonInterpreterApp {
    constructor() {
        this.isSkultReady = false;
        this.currentExampleIndex = 0;
        this.appState = 'loading'; // 'loading', 'ready', 'executing', 'completed', 'error'
        
        // Enhanced example code collection with more examples
        this.examples = [
            {
                title: "Tulostaminen",
                description: "Tulosta luku",
                code: `print(123)`
            },
            {
                title: "Muuttuja",
                description: "Tallenna luku muuttujaan",
                code: `a = 5
print(a)`
            },
            {
                title: "Laskeminen",
                description: "Yhteenlasku",
                code: `a = 3
b = 4
c = a + b
print(c)`
            },
            {
                title: "Kommentit",
                description: "Lisää selityksiä koodiin",
                code: `# Kirjoittamalla risuaidan saa kirjoitettua kommentteja!
a = 10
print(a)
# a = 5
print(a) # Kommentoidut rivit eivät vaikuta ohjelman toimintaan!`

            },
            {
                title: "Jos-ehto",
                description: "Tee jotain jos ehto toteutuu",
                code: `a = 7
if a > 5:
    print("Suuri")

if a == 5:
    print("Tasan viisi!")

if a < 5:
    print("Pieni")`
            },

            {
                title: "Muuten-ehto",
                description: "Tee jotakin muuta, jos ehto ei toteudu",
                code: `a = 4
b = 3
if a == b:
    print("Samat")
else:
    print("Eri")`
            },

            {
                title: "Silmukka",
                description: "Toista monta kertaa",
                code: `for a in range(5):
    print(a)`
            },
            {
                title: "Oma operaatio",
                description: "Tee oma funktio",
                code: `def tuplaa(luku):
    return luku * 2

a = 3
b = tuplaa(a)
print(b)`
            },
            {
                title: "Summa silmukalla",
                description: "Laske lukujen summa",
                code: `a = 0
for b in range(5):
    a = a + b
print(summa)`
            },
            {
                title: "Jakojäännös",
                description: "%-operaattori",
                code: `a = 17
b = a % 5
print(b)`
            },
            {
                title: "Jaollisuus",
                description: "Onko jaollinen",
                code: `a = 12
b = 3
if a % b == 0:
    print("Jaollinen")
else:
    print("Ei jaollinen")`
            },
            {
                title: "Lista",
                description: "Tallenna useita lukuja",
                code: `luvut = [5, 10, 15]
print(luvut[0])
print(luvut[1])
print(luvut[2])`
            },
            {
                title: "Listan pituus",
                description: "Kuinka monta asiaa on listassa",
                code: `luvut = [2, 4, 6, 8, 10]
pituus = len(luvut)
print(pituus)`
            },
            {
                title: "Listan muuttaminen",
                description: "Muuttaminen ja lisääminen",
                code: `luvut = [2, 4, 6, 8, 10]
print(luvut)
luvut[3] = 0
print(luvut)
luvut.append(12)
print(luvut)`
            },
            {
                title: "Listan läpikäynti",
                description: "Käy lista läpi",
                code: `luvut = [3, 7, 11]
pituus = len(luvut)
for i in range(pituus):
    print(luvut[i])`
            },
            {
                title: "Totuusarvot",
                description: "True ja False arvot",
                code: `on_totta = True
on_vaara = False
print(on_totta)
print(on_vaara)
print(5 > 3)
print(2 > 10)`
            },
            {
                title: "Totuusoperaatiot",
                description: "'Ja', 'tai' ja 'ei'",
                code: `a = True
b = False
print(a and b) # "ja"
print(a or b) # "tai"
print(not a) # "ei"
c = (a and b) or (a or b)
print(c)`
            },
            {
                title: "Syöte",
                description: "Kysy käyttäjältä luku",
                code: `a = int(input("Anna luku: "))
b = a * a
print(b)`
            },
            {
                title: "Merkkijono",
                description: "Käsittele tekstiä",
                code: `nimi = "Maija"
print(nimi)
print(len(nimi))`
            },
            {
                title: "Satunnaisluku",
                description: "Arvo luku",
                code: `import random

a = random.randint(1, 5)
print(a)`
            },
            {
                title: "Piirra viiva",
                description: "Piirrä viiva",
                code: `import turtle

t = turtle.Turtle()
t.forward(100)
t.right(90)
t.forward(50)`
            },
            {
                title: "Värillinen neliö",
                description: "Täytä neliö värillä",
                code: `import turtle

t = turtle.Turtle()
t.fillcolor("red")  # Väri nimellä: red, blue, green jne.
t.begin_fill()
for i in range(4):
    t.forward(100)
    t.right(90)
t.end_fill()`
            },
            {
                title: "Fibonacci",
                description: "Laske erään lukujonon lukuja",
                code: `edellinen = 0
nykyinen = 1
for i in range(5):
    seuraava = edellinen + nykyinen
    print(seuraava)
    edellinen = nykyinen
    nykyinen = seuraava`
            },
            {
                title: "Alkuluku",
                description: "Onko luku alkuluku",
                code: `def on_alkuluku(a):
    if a == 1:
        return False
    for i in range(2, a):
        if a % i == 0:
            return False
    return True

a = 17
if on_alkuluku(a):
    print("On alkuluku")
else:
    print("Ei ole alkuluku")`
            },
            {
                title: "Algoritmi",
                description: "Palautuuko luku aina ykköseen?",
                code: `def muunnos(a):
    if a % 2 == 0:
        return a//2
    else:
        return 3*a + 1

a = 13
for i in range(20):
    a = muunnos(a)
    print(a)`
            }
        ];
        
        // Finnish error message translations
        this.finnishErrorMessages = {
            "NameError": "Muuttujan nimi ei ole määritelty",
            "SyntaxError": "Kirjoitusvirhe koodissa",
            "IndentationError": "Sisennysvirhe - tarkista välilyönnit",
            "TypeError": "Väärä tietotyyppi",
            "ValueError": "Väärä arvo",
            "ZeroDivisionError": "Jakaminen nollalla ei ole sallittu",
            "IndexError": "Lista-indeksi ei ole olemassa",
            "KeyError": "Sanakirjan avain ei ole olemassa",
            "AttributeError": "Objektilla ei ole kyseistä ominaisuutta",
            "UnboundLocalError": "Paikallinen muuttuja käytössä ennen määrittelyä",
            "ImportError": "Moduulin tuominen epäonnistui",
            "ModuleNotFoundError": "Moduulia ei löydy",
            "KeyboardInterrupt": "Ohjelma keskeytetty käyttäjän toimesta",
            "OverflowError": "Luku on liian suuri",
            "RecursionError": "Ääretön rekursio - funktio kutsuu itseään loputtomasti",
            "FileNotFoundError": "Tiedostoa ei löydy",
            "PermissionError": "Ei oikeuksia tiedostoon",
            "EOFError": "Odottamaton tiedoston loppu",
            "TabError": "Sarkaimien ja välilyöntien sekoittaminen",
            "RuntimeError": "Suoritusaikainen virhe"
        };
        
        // Error hints in Finnish
        this.errorHints = {
            "NameError": "Varmista, että olet määritellyt muuttujan ennen sen käyttöä.",
            "SyntaxError": "Tarkista, että sisennykset, sulkeet, lainausmerkit jne. ovat kohdillaan.",
            "IndentationError": "Varmista tasaiset, sopivat sisennykset.",
            "TypeError": "Tarkista, että käytät oikeanlaisia arvoja (numerot vs. tekstit).",
            "ValueError": "Arvo on väärän muotoinen - esim. teksti numeron sijaan.",
            "ZeroDivisionError": "Matematiikassa ei voi jakaa nollalla!",
            "IndexError": "Lista on lyhyempi kuin luulit - tarkista indeksit.",
            "KeyError": "Sanakirjasta ei löydy kyseistä avainta.",
            "AttributeError": "Tämä objekti ei tue kyseistä toimintoa.",
            "UnboundLocalError": "Määrittele muuttuja ennen sen käyttöä funktiossa.",
            "ImportError": "Tarkista moduulin nimi - onko se kirjoitettu oikein?",
            "ModuleNotFoundError": "Moduuli ei ole asennettu tai nimi on väärä.",
            "KeyboardInterrupt": "Painoit Ctrl+C tai keskeytit ohjelman suorituksen.",
            "OverflowError": "Kokeile käyttää pienempiä lukuja.",
            "RecursionError": "Lisää lopetusehto rekursiiviseen funktioon.",
            "FileNotFoundError": "Tarkista tiedoston nimi ja polku.",
            "PermissionError": "Tiedosto saattaa olla lukittu tai käytössä.",
            "EOFError": "Ohjelma odotti syötettä, mutta sitä ei saatu.",
            "TabError": "Käytä vain välilyöntejä tai vain sarkaimia - älä sekoita!",
            "RuntimeError": "Jotain meni pieleen ohjelman suorituksen aikana."
        };
        
        this.initializeApp();
    }
    
    async initializeApp() {
        // Get DOM elements first
        this.loadingMessage = document.getElementById('loading-message');
        this.mainContent = document.getElementById('main-content');
        this.codeEditor = document.getElementById('code-editor');
        this.outputArea = document.getElementById('output-area');
        this.statusContainer = document.getElementById('status-container');
        this.exampleCodeDisplay = document.getElementById('example-code');
        this.copyExampleBtn = document.getElementById('copy-example-btn');
        this.nextExampleBtn = document.getElementById('next-example-btn');
        this.runCodeBtn = document.getElementById('run-code-btn');
        this.examplesDropdownBtn = document.getElementById('examples-dropdown-btn');
        this.examplesDropdown = document.getElementById('examples-dropdown');
        
        // New elements for examples page
        this.examplesPage = document.getElementById('examples-page');
        this.examplesList = document.getElementById('examples-list');
        this.backToEditorBtn = document.getElementById('back-to-editor-btn');
        
        // Line numbers element
        this.lineNumbers = document.getElementById('line-numbers');
        
        // Track execution time and long-running execution
        this.executionStartTime = null;
        this.executionTimer = null;
        this.timerInterval = null;
        this.currentExecution = null;
        
        // Input modal handling
        this.inputResolve = null;
        this.inputReject = null;
        
        // Show loading screen now that DOM elements are available
        this.showLoadingScreen();
        
        // Wait a moment to ensure Skulpt CDN has loaded
        await this.waitForSkulpt();
        
        // Setup Skulpt
        await this.initializeSkulpt();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load saved code
        this.loadSavedCode();
        
        // Show main content
        this.showMainContent();
        
        // Update example display and line numbers
        this.updateExampleDisplay();
        this.updateLineNumbers();
    }
    
    updateLineNumbers() {
        const lines = this.codeEditor.value.split('\n');
        const lineCount = lines.length;
        
        let lineNumbersText = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersText += i + '\n';
        }
        
        this.lineNumbers.textContent = lineNumbersText;
        this.syncLineNumbers();
    }
    
    syncLineNumbers() {
        // Sync scroll position of line numbers with code editor
        this.lineNumbers.scrollTop = this.codeEditor.scrollTop;
    }
    
    async waitForSkulpt() {
        return new Promise((resolve) => {
            const checkSkulpt = () => {
                if (typeof Sk !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkSkulpt, 100);
                }
            };
            checkSkulpt();
        });
    }
    
    async initializeSkulpt() {
        return new Promise((resolve) => {
            try {
                // Configure Skulpt with turtle graphics support and UTF-8 encoding
                Sk.configure({
                    output: this.skultOutput.bind(this),
                    read: this.skultRead.bind(this),
                    __future__: Sk.python3,
                    execLimit: null, // No time limit
                    yieldLimit: 50000, // Yield every 50,000 operations - balance between interactivity and performance
                    killableWhile: true,
                    killableFor: true,
                    debugging: false,
                    breakpoints: function() { return false; },
                    syspath: [],
                    inputfun: (prompt) => { return this.customInput(prompt); },
                    inputfunTakesPrompt: true
                });
                
                // Configure turtle graphics
                (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'turtle-canvas';
                Sk.TurtleGraphics.width = 400;
                Sk.TurtleGraphics.height = 300;
                
                this.isSkultReady = true;
                this.appState = 'ready';
                resolve();
            } catch (error) {
                console.error('Skulpt initialization failed:', error);
                this.showStatusMessage('Python-tulkin lataaminen epäonnistui. Yritä päivittää sivu.', 'error');
                resolve(); // Don't block the app
            }
        });
    }
    
    skultOutput(text) {
        // Handle output from Python code
        this.outputArea.textContent += text;
        this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }
    
    skultRead(filename) {
        // Handle file reads for Python standard library
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][filename] === undefined) {
            throw "File not found: '" + filename + "'";
        }
        return Sk.builtinFiles["files"][filename];
    }
    
    setupEventListeners() {
        // Code execution
        this.runCodeBtn.addEventListener('click', () => this.runCode());
        
        // Code management
        this.copyExampleBtn.addEventListener('click', () => this.copyExample());
        this.nextExampleBtn.addEventListener('click', () => this.nextExample());
        
        // Examples page navigation
        this.examplesDropdownBtn.addEventListener('click', () => this.showExamplesPage());
        this.backToEditorBtn.addEventListener('click', () => this.showMainContent());
        
        // Terminate execution button
        document.getElementById('terminate-execution-btn').addEventListener('click', () => this.terminateExecution());
        
        // Enter key in inline input field
        document.getElementById('inline-input-field').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitInput();
            }
        });
        
        // Auto-save on code change and update line numbers
        this.codeEditor.addEventListener('input', () => {
            this.saveCode();
            this.updateLineNumbers();
        });
        
        // Update line numbers on scroll
        this.codeEditor.addEventListener('scroll', () => this.syncLineNumbers());
        
        // Enhanced key handling
        this.codeEditor.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.runCode();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.insertTab();
            }
        });
    }
    
    insertTab() {
        const textarea = this.codeEditor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // Insert tab character
        const value = textarea.value;
        textarea.value = value.substring(0, start) + '\t' + value.substring(end);
        
        // Move cursor to after the inserted tab
        textarea.selectionStart = textarea.selectionEnd = start + 1;
    }
    
    async runCode() {
        if (!this.isSkultReady || this.appState === 'executing') {
            return;
        }
        
        const code = this.codeEditor.value.trim();
        if (!code) {
            this.showStatusMessage("Kirjoita ensin koodia!", 'error');
            return;
        }
        
        this.appState = 'executing';
        this.setUIState('executing');
        this.clearOutput();
        this.clearStatusMessages();
        
        // Check if code contains turtle graphics and show/hide canvas accordingly
        const hasTurtle = code.includes('import turtle') || code.includes('from turtle');
        this.toggleTurtleCanvas(hasTurtle);
        
        // Start timing (for debugging purposes)
        this.executionStartTime = performance.now();
        
        try {
            // Preprocess code to handle Finnish characters properly
            const processedCode = this.preprocessCodeForUTF8(code);
            
            // Execute Python code with Skulpt
            this.currentExecution = new Promise((resolve, reject) => {
                Sk.misceval.asyncToPromise(() => {
                    return Sk.importMainWithBody("<stdin>", false, processedCode, true);
                }).then(
                    () => {
                        this.appState = 'completed';
                        this.showStatusMessage('Koodi suoritettu onnistuneesti!', 'success');
                        resolve();
                    },
                    (error) => {
                        this.appState = 'error';
                        this.handlePythonError(error);
                        reject(error);
                    }
                );
            });
            
            await this.currentExecution;
        } catch (error) {
            // Handle any unexpected errors
            this.appState = 'error';
            this.showStatusMessage("Virhe koodissa!", 'error');
        } finally {
            this.setUIState('ready');
            this.hideInputField(); // Hide input field when execution completes
            this.currentExecution = null;
        }
    }
    
    handlePythonError(error) {
        let errorMessage = error.toString();
        
        // Check for operation limit exceeded or timeout error
        if (errorMessage.includes('timed out') || 
            errorMessage.includes('execution exceeded') ||
            errorMessage.includes('maximum recursion') ||
            errorMessage.includes('too many operations')) {
            this.outputArea.textContent = `Virhe: Koodin suoritus keskeytetty\n\nVinkki: Koodi suoritti liian monta operaatiota tai oli liian raskas. Tarkista, että koodissasi ei ole äärettömiä silmukoita tai liian raskaita laskutoimituksia.\n\nTarkempi tieto:\n${errorMessage}`;
            this.showStatusMessage("Koodin suoritus keskeytetty - liian raskas", 'error');
            return;
        }
        
        let errorType = this.extractErrorType(errorMessage);
        let finnishExplanation = this.finnishErrorMessages[errorType] || "Tuntematon virhe";
        let hint = this.errorHints[errorType] || "Tarkista koodisi huolellisesti.";
        
        // Check if the error might be caused by Finnish characters in variable names
        const code = this.codeEditor.value;
        const hasFinnishInIdentifiers = this.checkFinnishCharsOutsideStrings(code);
        
        // Create user-friendly error display
        let displayMessage = `Virhe: ${finnishExplanation}\n\n`;
        displayMessage += `Mahdollinen syy/vinkki: ${hint}\n\n`;
        
        // Add special warning for Finnish characters in variable names
        if (hasFinnishInIdentifiers && (errorType === 'SyntaxError' || errorMessage.includes('bad token'))) {
            displayMessage += `Älä käytä ääkkösiä (ä, ö, å) muuttujien nimissä!\n\n`;
        }
        
        displayMessage += `Tarkempi tieto:\n${errorMessage}`;
            
        this.outputArea.textContent = displayMessage;
        this.showStatusMessage("Koodissa on virhe. Katso selitys tuloste-alueelta.", 'error');
    }
    
    checkFinnishCharsOutsideStrings(code) {
        // Simple check to see if Finnish characters appear outside of strings
        // This is a basic implementation - not perfect but good enough for warning
        let inString = false;
        let stringChar = '';
        let inComment = false;
        
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            
            // Handle string literals
            if (!inComment && (char === '"' || char === "'" || char === '`')) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    // Check if it's escaped
                    let backslashes = 0;
                    let j = i - 1;
                    while (j >= 0 && code[j] === '\\') {
                        backslashes++;
                        j--;
                    }
                    if (backslashes % 2 === 0) {
                        inString = false;
                        stringChar = '';
                    }
                }
                continue;
            }
            
            // Handle comments
            if (!inString && char === '#') {
                inComment = true;
            }
            if (inComment && char === '\n') {
                inComment = false;
            }
            
            // Check for Finnish characters outside strings and comments
            if (!inString && !inComment && /[äöåÄÖÅ]/.test(char)) {
                return true;
            }
        }
        
        return false;
    }
    
    customInput(prompt) {
        // Return a Promise that resolves when user provides input
        return new Promise((resolve, reject) => {
            this.inputResolve = resolve;
            this.inputReject = reject;
            
            // Set up the inline input field
            const container = document.getElementById('inline-input-container');
            const promptElement = document.getElementById('inline-input-prompt');
            const inputField = document.getElementById('inline-input-field');
            
            // Set the prompt text
            promptElement.textContent = prompt || 'Syöte:';
            
            // Clear and focus the input field
            inputField.value = '';
            
            // Show the input container
            container.style.display = 'block';
            
            // Focus the input field after a short delay
            setTimeout(() => {
                inputField.focus();
            }, 100);
        });
    }
    
    submitInput() {
        const inputField = document.getElementById('inline-input-field');
        const value = inputField.value;
        
        // Hide the input container
        document.getElementById('inline-input-container').style.display = 'none';
        
        // Show the user's input in the output area (like a terminal)
        const promptText = document.getElementById('inline-input-prompt').textContent;
        this.outputArea.textContent += `${promptText}${value}\n`;
        
        // Resolve the promise with the input value
        if (this.inputResolve) {
            this.inputResolve(value);
            this.inputResolve = null;
            this.inputReject = null;
        }
    }
    
    hideInputField() {
        // Hide the input container when execution finishes
        document.getElementById('inline-input-container').style.display = 'none';
    }
    
    extractErrorType(errorMessage) {
        // Extract the error type from Skulpt error message
        for (let errorType of Object.keys(this.finnishErrorMessages)) {
            if (errorMessage.includes(errorType)) {
                return errorType;
            }
        }
        return null;
    }
    
    clearCode() {
        this.codeEditor.value = '';
        this.clearOutput();
        this.clearStatusMessages();
        this.saveCode();
        this.updateLineNumbers();
    }
    
    clearOutput() {
        this.outputArea.textContent = '';
        this.hideInputField(); // Hide input field when clearing output
    }
    
    toggleTurtleCanvas(show) {
        const turtleContainer = document.getElementById('turtle-container');
        if (show) {
            turtleContainer.style.display = 'block';
            // Clear previous turtle graphics
            document.getElementById('turtle-canvas').innerHTML = '';
        } else {
            turtleContainer.style.display = 'none';
        }
    }
    
    clearStatusMessages() {
        this.statusContainer.innerHTML = '';
    }
    
    startLongRunningTimer() {
        // This is now just for cleanup - actual timer display is handled in runCode
        this.timerStarted = false;
    }
    
    startTimerUpdates() {
        if (this.timerStarted) return; // Prevent duplicate timers
        this.timerStarted = true;
        
        const secondsElement = document.getElementById('execution-seconds');
        if (!secondsElement) return;
        
        const startTime = this.executionStartTime;
        
        // Update timer display immediately and then every second
        const updateDisplay = () => {
            if (!this.currentExecution) {
                if (this.timerInterval) clearInterval(this.timerInterval);
                return;
            }
            
            const elapsed = Math.round((performance.now() - startTime) / 1000);
            secondsElement.textContent = elapsed;
        };
        
        // Update immediately
        updateDisplay();
        
        // Then update every second
        this.timerInterval = setInterval(updateDisplay, 1000);
    }
    
    stopLongRunningTimer() {
        if (this.executionTimer) {
            clearTimeout(this.executionTimer);
            this.executionTimer = null;
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerStarted = false;
        this.stopResponsivenessMonitor();
        
        const timerContainer = document.getElementById('execution-timer-container');
        if (timerContainer) {
            timerContainer.style.display = 'none';
        }
    }
    
    startResponsivenessMonitor() {
        if (this.responsivenessMonitor) return;
        
        let lastHeartbeat = Date.now();
        let missedHeartbeats = 0;
        
        // Send a heartbeat every 200ms
        const heartbeat = () => {
            if (!this.currentExecution) return;
            lastHeartbeat = Date.now();
            missedHeartbeats = 0;
        };
        
        this.responsivenessInterval = setInterval(heartbeat, 200);
        
        // Check for missed heartbeats every 1 second
        this.responsivenessMonitor = setInterval(() => {
            if (!this.currentExecution) {
                this.stopResponsivenessMonitor();
                return;
            }
            
            const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
            
            // If more than 2 seconds since last heartbeat, consider the page frozen
            if (timeSinceLastHeartbeat > 2000) {
                missedHeartbeats++;
                console.log(`Browser appears frozen - missed heartbeat #${missedHeartbeats} (${timeSinceLastHeartbeat}ms ago)`);
                
                // If we've missed 3 heartbeats in a row, force termination
                if (missedHeartbeats >= 2) {
                    console.log('Force terminating execution due to frozen browser');
                    this.forceTermination();
                }
            }
        }, 1000);
    }
    
    stopResponsivenessMonitor() {
        if (this.responsivenessInterval) {
            clearInterval(this.responsivenessInterval);
            this.responsivenessInterval = null;
        }
        if (this.responsivenessMonitor) {
            clearInterval(this.responsivenessMonitor);
            this.responsivenessMonitor = null;
        }
    }
    
    forceTermination() {
        // Nuclear option: completely reinitialize everything
        this.currentExecution = null;
        this.setUIState('ready');
        this.stopLongRunningTimer();
        this.showStatusMessage('Koodin suoritus keskeytetty - selain jäätyi', 'error');
        this.outputArea.textContent = 'Virhe: Koodin suoritus keskeytetty\n\nVinkki: Koodi aiheutti selaimen jäätymisen ja keskeytettiin automaattisesti. Vältä raskaita laskutoimituksia.\n\nSyy: Selain ei vastannut yli 4 sekuntiin.';
        
        // Reinitialize Skulpt to ensure clean state
        setTimeout(() => {
            this.initializeSkulpt();
        }, 100);
    }
    
    terminateExecution() {
        if (this.currentExecution) {
            // Use multiple methods to try to interrupt Skulpt execution
            try {
                // Method 1: Force timeout by setting execStart to past time
                Sk.execStart = Date.now() + 1;
                
                // Method 2: Set interrupt flag
                Sk.interrupted = true;
                
                // Method 3: Clear execution limit to force check
                if (Sk.execLimit) {
                    Sk.execLimit = 1;
                }
                
                this.appState = 'interrupted';
                this.showStatusMessage('Koodin suoritus keskeytetty käyttäjän toimesta', 'error');
            } catch (e) {
                // If that doesn't work, just update the UI
                this.showStatusMessage('Koodin suoritus keskeytetty', 'error');
            }
            this.stopLongRunningTimer();
            this.setUIState('ready');
            this.currentExecution = null;
        }
    }
    
    preprocessCodeForUTF8(code) {
        // Add UTF-8 encoding declaration at the top if not present
        let processedCode = code;
        
        // Add UTF-8 coding declaration if not already present
        if (!processedCode.includes('# -*- coding:') && !processedCode.includes('# coding:')) {
            processedCode = '# -*- coding: utf-8 -*-\n' + processedCode;
        }
        
        // Ensure the string is properly normalized for Unicode consistency
        try {
            processedCode = processedCode.normalize('NFC');
        } catch (e) {
            // If normalization fails, continue with original
            console.warn('Unicode normalization failed:', e);
        }
        
        // Log the processed code for debugging Finnish character issues
        if (processedCode.match(/[äöåÄÖÅ]/)) {
            console.log('Code contains Finnish characters, processed:', processedCode.substring(0, 200) + '...');
        }
        
        return processedCode;
    }
    
    copyExample() {
        const currentExample = this.examples[this.currentExampleIndex];
        
        // Clear everything first
        this.clearOutput();
        this.clearStatusMessages();
        
        // Hide turtle canvas and input field
        const turtleContainer = document.getElementById('turtle-container');
        const inputContainer = document.getElementById('inline-input-container');
        if (turtleContainer) turtleContainer.style.display = 'none';
        if (inputContainer) inputContainer.style.display = 'none';
        
        // Terminate any running execution
        if (this.currentExecution) {
            this.currentExecution = null;
            this.setUIState('ready');
        }
        
        // Load the example code
        this.codeEditor.value = currentExample.code;
        this.saveCode();
        this.updateLineNumbers();
        this.showStatusMessage(`Esimerkki "${currentExample.title}" kopioitu!`, 'success');
    }
    
    nextExample() {
        this.currentExampleIndex = (this.currentExampleIndex + 1) % this.examples.length;
        this.updateExampleDisplay();
    }
    
    updateExampleDisplay() {
        const currentExample = this.examples[this.currentExampleIndex];
        this.exampleCodeDisplay.innerHTML = this.formatCodeForDisplay(currentExample.code);
    }
    
    formatCodeForDisplay(code) {
        // Convert code to HTML with proper line breaks
        return code.split('\n').join('<br>');
    }
    
    toggleExamplesDropdown() {
        const isVisible = this.examplesDropdown.style.display !== 'none';
        
        if (!isVisible) {
            this.populateExamplesDropdown();
            this.examplesDropdown.style.display = 'block';
            this.examplesDropdownBtn.textContent = 'Piilota esimerkit ▲';
        } else {
            this.examplesDropdown.style.display = 'none';
            this.examplesDropdownBtn.textContent = 'Lisää esimerkkejä ▼';
        }
    }
    
    populateExamplesDropdown() {
        this.examplesDropdown.innerHTML = '';
        
        const title = document.createElement('h3');
        title.textContent = 'Valitse esimerkki:';
        title.style.marginBottom = '15px';
        title.style.color = '#333';
        this.examplesDropdown.appendChild(title);
        
        this.examples.forEach((example, index) => {
            const exampleDiv = document.createElement('div');
            exampleDiv.className = 'dropdown-example';
            
            if (index === this.currentExampleIndex) {
                exampleDiv.classList.add('current');
            }
            
            exampleDiv.innerHTML = `
                <h4>${example.title}</h4>
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">${example.description}</p>
                <pre>${example.code}</pre>
            `;
            
            exampleDiv.addEventListener('click', () => {
                this.currentExampleIndex = index;
                this.copyExample();
                this.updateExampleDisplay();
                this.toggleExamplesDropdown();
            });
            
            this.examplesDropdown.appendChild(exampleDiv);
        });
    }
    
    setUIState(state) {
        const isExecuting = state === 'executing';
        
        this.runCodeBtn.disabled = isExecuting;
        this.runCodeBtn.textContent = isExecuting ? 'Suoritetaan...' : 'Suorita koodi';
        this.codeEditor.disabled = isExecuting;
        
        if (isExecuting) {
            this.runCodeBtn.style.backgroundColor = '#cccccc';
        } else {
            this.runCodeBtn.style.backgroundColor = '#4caf50';
        }
    }
    
    showStatusMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        this.statusContainer.innerHTML = '';
        this.statusContainer.appendChild(messageDiv);
        
        // Auto-clear success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }
    }
    
    saveCode() {
        localStorage.setItem('maailmantutkija-python-code', this.codeEditor.value);
    }
    
    loadSavedCode() {
        const savedCode = localStorage.getItem('maailmantutkija-python-code');
        if (savedCode) {
            this.codeEditor.value = savedCode;
            this.updateLineNumbers();
        }
    }
    
    showLoadingScreen() {
        this.loadingMessage.style.display = 'block';
        this.mainContent.style.display = 'none';
    }
    
    showMainContent() {
        this.loadingMessage.style.display = 'none';
        this.mainContent.style.display = 'block';
        this.examplesPage.style.display = 'none';
    }
    
    showExamplesPage() {
        this.mainContent.style.display = 'none';
        this.examplesPage.style.display = 'block';
        this.populateExamplesList();
    }
    
    populateExamplesList() {
        this.examplesList.innerHTML = '';
        
        this.examples.forEach((example, index) => {
            const exampleDiv = document.createElement('div');
            exampleDiv.className = 'example-item';
            
            exampleDiv.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span class="example-number">${index + 1}</span>
                    <span class="example-title">${example.title}</span>
                </div>
                <div class="example-description">${example.description}</div>
            `;
            
            exampleDiv.addEventListener('click', () => {
                this.loadExample(index);
                this.showMainContent();
            });
            
            this.examplesList.appendChild(exampleDiv);
        });
    }
    
    loadExample(index) {
        const example = this.examples[index];
        
        // Clear everything first
        this.clearOutput();
        this.clearStatusMessages();
        
        // Hide turtle canvas and input field
        const turtleContainer = document.getElementById('turtle-container');
        const inputContainer = document.getElementById('inline-input-container');
        if (turtleContainer) turtleContainer.style.display = 'none';
        if (inputContainer) inputContainer.style.display = 'none';
        
        // Terminate any running execution
        if (this.currentExecution) {
            this.currentExecution = null;
            this.setUIState('ready');
        }
        
        // Load the example code
        this.codeEditor.value = example.code;
        this.saveCode();
        this.updateLineNumbers();
        this.showStatusMessage(`Esimerkki "${example.title}" ladattu!`, 'success');
    }
    
    setupHelpTooltip() {
        const helpIcon = document.getElementById('help-icon');
        const helpTooltip = document.getElementById('help-tooltip');
        
        helpIcon.addEventListener('mouseenter', () => {
            helpTooltip.style.display = 'block';
        });
        
        helpIcon.addEventListener('mouseleave', () => {
            helpTooltip.style.display = 'none';
        });
        
        // Touch support for mobile
        helpIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = helpTooltip.style.display === 'block';
            helpTooltip.style.display = isVisible ? 'none' : 'block';
        });
        
        // Hide tooltip when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!helpIcon.contains(e.target)) {
                helpTooltip.style.display = 'none';
            }
        });
    }
}

// Initialize the app when page loads or immediately if already loaded
function initializePythonInterpreterApp() {
    new PythonInterpreterApp();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePythonInterpreterApp);
} else {
    // DOM already loaded (script loaded dynamically after page load)
    initializePythonInterpreterApp();
}