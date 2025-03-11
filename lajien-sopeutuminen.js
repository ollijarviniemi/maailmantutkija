document.addEventListener('DOMContentLoaded', () => {
    // Game data
    const animalPairs = [
        {
            leftImage: "images/lajien-sopeutuminen/pelecanus-onocrotalus-great-white-pelican-mount-registration-no-b-33022-331752-large.jpg",
            rightImage: "images/lajien-sopeutuminen/Lophophanes_cristatus_-_02.jpg",
            leftName: "Pelikaani (Pelecanus)",
            rightName: "Töyhtötiainen (Lophophanes cristatus)",
            question: "Toinen näistä eläimistä syö hyönteisiä puiden oksista ja toinen syö kaloja. Kumpi on kumpi?",
            leftButtonText: "Vasen syö hyönteisiä",
            rightButtonText: "Oikea syö hyönteisiä",
            correctAnswer: "right", // right = töyhtötiainen syö hyönteisiä
            explanation: "Tämän voi päätellä nokkien koosta: pelikaanilla on suuri nokka, jolla se voi kauhoa kaloja vedestä, kun taas töyhtötiaisella on pieni nokka, jolla se voi poimia hyönteisiä puiden oksista."
        },
        {
            leftImage: "images/lajien-sopeutuminen/Eurasian_eagle-owl_(44088).jpg",
            rightImage: "images/lajien-sopeutuminen/Accipiter_striatus,_Canet_Road,_San_Luis_Obispo_1.jpg",
            leftName: "Huuhkaja (Bubo bubo)",
            rightName: "Haukka (Accipiter)",
            question: "Toinen näistä eläimistä metsästää päivällä ja toinen yöllä. Kumpi on kumpi?",
            leftButtonText: "Vasen metsästää yöllä",
            rightButtonText: "Oikea metsästää yöllä",
            correctAnswer: "left", // left = huuhkaja metsästää yöllä
            explanation: "Tämän voi päätellä silmien koosta: huuhkajalla on suuret silmät, jotka keräävät tehokkaasti valoa yöllä metsästämistä varten, kun taas haukalla on pienemmät silmät, jotka ovat sopeutuneet päivänvalossa metsästämiseen."
        },
        {
            leftImage: "images/lajien-sopeutuminen/Flamingos_Laguna_Colorada.jpg",
            rightImage: "images/lajien-sopeutuminen/Struthio_camelus_-_Etosha_2014_(3).jpg",
            leftName: "Flamingo (Phoenicopterus)",
            rightName: "Strutsi (Struthio)",
            question: "Toinen näistä eläimistä osaa lentää ja toinen ei. Kumpi on kumpi?",
            leftButtonText: "Vasen osaa lentää",
            rightButtonText: "Oikea osaa lentää",
            correctAnswer: "left", // left = flamingo osaa lentää
            explanation: "Tämän voi päätellä ruumiinrakenteesta: strutsi on paljon tukevampi ja raskaampi, mikä tekee lentämisestä mahdotonta, kun taas flamingolla on kevyempi ruumiinrakenne ja siivet, jotka mahdollistavat lentämisen."
        },
        {
            leftImage: "images/lajien-sopeutuminen/Flying_Fish_(PSF).png",
            rightImage: "images/lajien-sopeutuminen/Cyprinus_carpio_2008_G1_(cropped).jpg",
            leftName: "Liitokala (Exocoetidae)",
            rightName: "Ruutana (Carassius carassius)",
            question: "Toinen näistä kaloista ui pinnan lähellä ja toinen syvemmällä. Kumpi on kumpi?",
            leftButtonText: "Vasen ui pinnan lähellä",
            rightButtonText: "Oikea ui pinnan lähellä",
            correctAnswer: "left", // left = liitokala ui pinnan lähellä
            explanation: "Tämän voi päätellä ruumiinrakenteesta: ruutana on pyöreämpi ja tukevampi, mikä auttaa sitä kestämään syvän veden painetta, kun taas liitokala on litteämpi ja sen evät ovat muotoutuneet niin, että se voi jopa hypätä veden pinnasta ja liitää ilmassa."
        },
        {
            leftImage: "images/lajien-sopeutuminen/Eurasian_blue_tit_Lancashire.jpg",
            rightImage: "images/lajien-sopeutuminen/PileatedWoodpeckerFeedingonTree,_crop.jpg",
            leftName: "Sinitiainen (Cyanistes caeruleus)",
            rightName: "Tikka (Picidae)",
            question: "Toinen näistä linnuista syö hyönteisiä puun pinnalta ja toinen puun sisältä. Kumpi on kumpi?",
            leftButtonText: "Vasen syö puun pinnalta",
            rightButtonText: "Oikea syö puun pinnalta",
            correctAnswer: "left", // left = sinitiainen syö puun pinnalta
            explanation: "Tämän voi päätellä nokkien pituuksista ja vahvuuksista: tikalla on pitkä ja vahva nokka, jolla se voi hakata puuta ja kaivaa hyönteisiä puun sisältä, kun taas sinitiaisen nokka on lyhyempi ja soveltuu hyönteisten poimimiseen puun pinnalta."
        },
        {
            leftImage: "images/lajien-sopeutuminen/OM1C2611_(53755898331).jpg",
            rightImage: "images/lajien-sopeutuminen/Hirundo_rustica_-Saxony,_Germany-8.jpg",
            leftName: "Västäräkki (Motacilla)",
            rightName: "Pääsky (Hirundo)",
            question: "Toinen näistä linnuista syö hyönteisiä maasta ja toinen ilmasta. Kumpi on kumpi?",
            leftButtonText: "Vasen syö maasta",
            rightButtonText: "Oikea syö maasta",
            correctAnswer: "left", // left = västäräkki syö maasta
            explanation: "Tämän voi päätellä siipien suuruuksista: pääskyllä on pidemmät ja terävämmät siivet, jotka tekevät siitä nopeamman ja ketterämmän lentäjän, mikä on hyödyllistä ilmassa lentävien hyönteisten pyydystämisessä, kun taas västäräkillä on lyhyemmät siivet ja se viihtyy enemmän maassa."
        }
    ];

    // Game state
    let currentPairIndex = 0;
    let randomizedPairs = [];
    let score = 0;

    // DOM elements
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultsScreen = document.getElementById('results-screen');
    
    const startButton = document.getElementById('start-button');
    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');
    const nextButton = document.getElementById('next-button');
    const restartButton = document.getElementById('restart-button');
    
    const progressIndicator = document.getElementById('progress-indicator');
    const leftImage = document.getElementById('left-image');
    const rightImage = document.getElementById('right-image');
    const questionText = document.getElementById('question-text');
    const answerContainer = document.getElementById('answer-container');
    const answerText = document.getElementById('answer-text');

    // Initialize the game
    function initGame() {
        // Set up event listeners
        startButton.addEventListener('click', startGame);
        leftButton.addEventListener('click', () => checkAnswer('left'));
        rightButton.addEventListener('click', () => checkAnswer('right'));
        nextButton.addEventListener('click', showNextPair);
        restartButton.addEventListener('click', restartGame);
    }

    // Start the game
    function startGame() {
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        // Reset game state
        currentPairIndex = 0;
        score = 0;
        
        // Randomize the animal pairs
        randomizeAnimalPairs();
        
        // Show the first pair
        showCurrentPair();
    }
    
    // Randomize the order of images in each animal pair
    function randomizeAnimalPairs() {
        randomizedPairs = [];
        
        animalPairs.forEach(pair => {
            // Create a copy of the pair to avoid modifying the original
            const randomizedPair = { ...pair };
            
            // Randomly decide if we should swap the left and right images
            const shouldSwap = Math.random() < 0.5;
            
            if (shouldSwap) {
                // Swap images
                [randomizedPair.leftImage, randomizedPair.rightImage] = [randomizedPair.rightImage, randomizedPair.leftImage];
                
                // Swap names
                [randomizedPair.leftName, randomizedPair.rightName] = [randomizedPair.rightName, randomizedPair.leftName];
                
                // Swap button texts
                //[randomizedPair.leftButtonText, randomizedPair.rightButtonText] = [randomizedPair.rightButtonText, randomizedPair.leftButtonText];
                
                // Invert the correct answer
                randomizedPair.correctAnswer = randomizedPair.correctAnswer === 'left' ? 'right' : 'left';
            }
            
            randomizedPairs.push(randomizedPair);
        });
    }

    // Show the current animal pair
    function showCurrentPair() {
        const currentPair = randomizedPairs[currentPairIndex];
        
        // Update progress indicator
        const progressPercentage = (currentPairIndex / animalPairs.length) * 100;
        progressIndicator.style.width = `${progressPercentage}%`;
        
        // Load the images
        leftImage.src = currentPair.leftImage;
        rightImage.src = currentPair.rightImage;
        
        // Set the question text
        questionText.textContent = currentPair.question;
        
        // Set custom button texts
        leftButton.textContent = currentPair.leftButtonText;
        rightButton.textContent = currentPair.rightButtonText;
        
        // Hide the answer container
        answerContainer.classList.remove('visible');
        
        // Enable the buttons
        leftButton.disabled = false;
        rightButton.disabled = false;
    }

    // Check the user's answer
    function checkAnswer(userChoice) {
        const currentPair = randomizedPairs[currentPairIndex];
        
        // Determine if the answer is correct
        const isCorrect = userChoice === currentPair.correctAnswer;
        
        // Update score if correct
        if (isCorrect) {
            score++;
        }
        
        // Disable the buttons to prevent multiple answers
        leftButton.disabled = true;
        rightButton.disabled = true;
        
        // Show the answer
        let answerHtml = '';
        
        // Add feedback on whether the answer was correct
        if (isCorrect) {
            answerHtml += `<p style="color: #2ecc71; font-weight: bold;">Oikein!</p>`;
        } else {
            answerHtml += `<p style="color: #e74c3c; font-weight: bold;">Väärin!</p>`;
        }
        
        // Add the animal names
        answerHtml += `<p><span class="animal-name">${currentPair.leftName}</span> (vasemmalla) ja <span class="animal-name">${currentPair.rightName}</span> (oikealla).</p>`;
        
        // Add the correct answer
        /*
        if (currentPair.correctAnswer === 'left') {
            answerHtml += `<p>Oikea vastaus: <span class="animal-name">${currentPair.leftName}</span> ${getAnswerText(currentPair.question, 'left')}</p>`;
        } else {
            answerHtml += `<p>Oikea vastaus: <span class="animal-name">${currentPair.rightName}</span> ${getAnswerText(currentPair.question, 'right')}</p>`;
        }
        */
        
        // Add the explanation
        answerHtml += `<p class="explanation">${currentPair.explanation}</p>`;
        
        // Update the answer text
        answerText.innerHTML = answerHtml;
        
        // Show the answer container
        answerContainer.classList.add('visible');
    }

    // Helper function to extract the relevant part of the answer from the question
    function getAnswerText(question, position) {
        // Extract the part of the question that describes the characteristic
        const parts = question.split('Toinen näistä ');
        if (parts.length < 2) return '';
        
        const characteristicPart = parts[1].split('. Kumpi')[0];
        return characteristicPart;
    }

    // Show the next animal pair
    function showNextPair() {
        currentPairIndex++;
        
        // Check if the game is over
        if (currentPairIndex >= animalPairs.length) {
            // Update results screen with score
            const totalPairs = animalPairs.length;
            const scorePercentage = Math.round((score / totalPairs) * 100);
            
            const resultsElement = document.createElement('p');
            resultsElement.innerHTML = `Sait <strong>${score}/${totalPairs}</strong> oikein! (${scorePercentage}%)`;
            resultsElement.style.fontSize = '1.2rem';
            resultsElement.style.marginBottom = '20px';
            
            // Clear any previous results
            const existingResults = document.querySelector('#results-screen p:not(:first-child)');
            if (existingResults) {
                existingResults.remove();
            }
            
            // Add the new results
            document.querySelector('#results-screen h2').after(resultsElement);
            
            // Hide game screen and show results
            gameScreen.classList.add('hidden');
            resultsScreen.classList.remove('hidden');
        } else {
            // Show the next pair
            showCurrentPair();
        }
    }

    // Restart the game
    function restartGame() {
        // Reset game state
        currentPairIndex = 0;
        score = 0;
        
        // Randomize the animal pairs again
        randomizeAnimalPairs();
        
        // Show the start screen
        resultsScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }

    // Initialize the game
    initGame();
});
