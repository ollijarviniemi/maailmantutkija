document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let gameData = {
        topics: [],
        currentTopicIndex: 0,
        score: 0,
        answers: {}
    };

    // DOM elements
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const feedbackScreen = document.getElementById('feedback-screen');
    const resultsScreen = document.getElementById('results-screen');
    
    const startButton = document.getElementById('start-button');
    const topButton = document.getElementById('top-button');
    const bottomButton = document.getElementById('bottom-button');
    const nextButton = document.getElementById('next-button');
    const restartButton = document.getElementById('restart-button');
    
    const progressText = document.getElementById('progress-text');
    const scoreText = document.getElementById('score-text');
    const graphTitle = document.getElementById('graph-title');
    const currentImage = document.getElementById('current-image');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');
    const finalScore = document.getElementById('final-score');
    const finalPercentage = document.getElementById('final-percentage');

    // Initialize the game
    async function initGame() {
        try {
            // Load the correct answers
            const response = await fetch('correct_answers.json');
            if (!response.ok) {
                throw new Error('Failed to load correct answers');
            }
            
            gameData.answers = await response.json();
            
            // Get all topics from the answers
            const allTopics = Object.keys(gameData.answers);
            
            // Filter out topics that don't have corresponding images
            gameData.topics = [];
            
            // Check each topic for image availability
            for (const topic of allTopics) {
                const img = new Image();
                img.src = `images/${topic}_graph.png`;
                
                // Add topic to the list if the image exists
                img.onload = function() {
                    gameData.topics.push(topic);
                    
                    // If this is the first image loaded, shuffle and start
                    if (gameData.topics.length === 1) {
                        shuffleArray(gameData.topics);
                    }
                };
                
                // Handle image load error (missing image)
                img.onerror = function() {
                    console.warn(`Image for topic "${topic}" not found. Skipping.`);
                };
            }
            
            // Set up event listeners
            startButton.addEventListener('click', startGame);
            topButton.addEventListener('click', () => checkAnswer('top'));
            bottomButton.addEventListener('click', () => checkAnswer('bottom'));
            nextButton.addEventListener('click', showNextTopic);
            restartButton.addEventListener('click', restartGame);
            
        } catch (error) {
            console.error('Error initializing game:', error);
            alert('Error loading game data. Please try refreshing the page.');
        }
    }

    // Start the game
    function startGame() {
        // Make sure we have at least one topic with a valid image
        if (gameData.topics.length === 0) {
            alert('No valid images found. Please check the images directory.');
            return;
        }
        
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        // Reset game state
        gameData.currentTopicIndex = 0;
        gameData.score = 0;
        
        // Show the first topic
        showCurrentTopic();
    }

    // Show the current topic
    function showCurrentTopic() {
        const currentTopic = gameData.topics[gameData.currentTopicIndex];
        const topicData = gameData.answers[currentTopic];
        
        // Update progress and score
        progressText.textContent = `Kuva ${gameData.currentTopicIndex + 1}/${gameData.topics.length}`;
        scoreText.textContent = `Pisteet: ${gameData.score}`;
        
        // Update graph title
        graphTitle.textContent = topicData.nimi;
        
        // Load the image
        currentImage.src = `images/${currentTopic}_graph.png`;
        currentImage.alt = topicData.nimi;
        
        // Handle image load error
        currentImage.onerror = function() {
            console.error(`Failed to load image for topic "${currentTopic}"`);
            showNextTopic(); // Skip to the next topic if image fails to load
        };
    }

    // Check the user's answer
    function checkAnswer(userChoice) {
        const currentTopic = gameData.topics[gameData.currentTopicIndex];
        const topicData = gameData.answers[currentTopic];
        const correctPosition = topicData.position;
        
        // Determine if the answer is correct
        const isCorrect = userChoice === correctPosition;
        
        // Update score if correct
        if (isCorrect) {
            gameData.score++;
        }
        
        // Show feedback
        gameScreen.classList.add('hidden');
        feedbackScreen.classList.remove('hidden');
        
        if (isCorrect) {
            feedbackTitle.textContent = 'Oikein!';
            feedbackTitle.style.color = '#2ecc71';
        } else {
            feedbackTitle.textContent = 'Väärin!';
            feedbackTitle.style.color = '#e74c3c';
        }
        
        feedbackText.textContent = `Oikea vastaus on ${correctPosition === 'top' ? 'ylempi' : 'alempi'} kuvaaja.`;
    }

    // Show the next topic
    function showNextTopic() {
        gameData.currentTopicIndex++;
        
        // Check if the game is over
        if (gameData.currentTopicIndex >= gameData.topics.length) {
            showResults();
        } else {
            // Show the next topic
            feedbackScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            showCurrentTopic();
        }
    }

    // Show the results screen
    function showResults() {
        feedbackScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');
        
        const totalTopics = gameData.topics.length;
        const percentage = Math.round((gameData.score / totalTopics) * 100);
        
        finalScore.textContent = `Sait ${gameData.score}/${totalTopics} pistettä.`;
        finalPercentage.textContent = `Onnistumisprosentti: ${percentage}%`;
    }

    // Restart the game
    function restartGame() {
        // Shuffle the topics again
        shuffleArray(gameData.topics);
        
        // Reset game state
        gameData.currentTopicIndex = 0;
        gameData.score = 0;
        
        // Show the start screen
        resultsScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }

    // Utility function to shuffle an array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Initialize the game
    initGame();
});
