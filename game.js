document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let gameData = {
        topics: [],
        currentTopicIndex: 0,
        score: 0,
        answers: {},
        shuffleTopics: false, // Set to false to use fixed order
        // Define your custom order here - this is a complete list of all available topics
        // You can rearrange, remove, or comment out entries to create your desired order
        customOrder: [
            // Historical trends
            "population",              // World population
            "agriculture_labor",       // Share of labor force in agriculture in the UK
            "working_hours",           // Annual working hours per worker in the UK
            "caloric_supply",          // Daily caloric supply per person in the UK
            "lighting_cost",           // Price of light in the UK
            "energy_per_capita",       // Energy consumption per capita

            // Health and development
            "height",                  // Average human height by year of birth
            "child_mortality",         // Child mortality worldwide
            "extreme_poverty",         // Share of people living in extreme poverty
            "life-expectancy",         // Life expectancy worldwide
            "smallpox",                // Reported smallpox cases
            
            // Social progress
            "literacy",                // World literacy rate
            "democracy",               // Share of people living in democracies
            "women_parliament",        // Share of women in parliaments (global)
            "universal_vote",          // Countries with universal suffrage
            "city_population",         // Share of population living in cities
            
            // Modern trends
            "war_deaths",              // Deaths in wars
            "air_passengers",          // Number of air passengers worldwide
            "space_visits",            // Human visits to space
            "internet_users",          // Number of internet users worldwide
            "global_temperature"       // Global average temperature
        ]     
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
            
            // Track how many images we've checked
            let checkedCount = 0;
            
            // Check each topic for image availability
            for (const topic of allTopics) {
                const img = new Image();
                img.src = `images/${topic}_graph.png`;
                
                // Add topic to the list if the image exists
                img.onload = function() {
                    gameData.topics.push(topic);
                    checkedCount++;
                    
                    // Once all images have been checked, prepare topics
                    if (checkedCount === allTopics.length) {
                        prepareTopics();
                    }
                };
                
                // Handle image load error (missing image)
                img.onerror = function() {
                    console.warn(`Image for topic "${topic}" not found. Skipping.`);
                    checkedCount++;
                    
                    // Once all images have been checked, prepare topics
                    if (checkedCount === allTopics.length) {
                        prepareTopics();
                    }
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
        
        // Show feedback directly on the game screen
        // Create temporary feedback elements if they don't exist
        let tempFeedbackContainer = document.getElementById('temp-feedback-container');
        if (!tempFeedbackContainer) {
            tempFeedbackContainer = document.createElement('div');
            tempFeedbackContainer.id = 'temp-feedback-container';
            tempFeedbackContainer.style.textAlign = 'center';
            tempFeedbackContainer.style.margin = '20px 0';
            document.getElementById('image-container').after(tempFeedbackContainer);
        }
        
        // Display feedback
        tempFeedbackContainer.innerHTML = `
            <h2 style="color: ${isCorrect ? '#2ecc71' : '#e74c3c'}">${isCorrect ? 'Oikein!' : 'Väärin!'}</h2>
            <p>Oikea vastaus on ${correctPosition === 'top' ? 'ylempi' : 'alempi'} kuvaaja.</p>
            <button id="temp-next-button" class="btn">Seuraava</button>
        `;
        
        // Disable choice buttons
        topButton.disabled = true;
        bottomButton.disabled = true;
        
        // Add event listener to the temporary next button
        document.getElementById('temp-next-button').addEventListener('click', showNextTopic);
        
        // Update feedback screen content (even though we're not showing it)
        // This keeps the state consistent in case we need it later
        feedbackTitle.textContent = isCorrect ? 'Oikein!' : 'Väärin!';
        feedbackTitle.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
        feedbackText.textContent = `Oikea vastaus on ${correctPosition === 'top' ? 'ylempi' : 'alempi'} kuvaaja.`;
    }

    // Show the next topic
    function showNextTopic() {
        gameData.currentTopicIndex++;
        
        // Check if the game is over
        if (gameData.currentTopicIndex >= gameData.topics.length) {
            // Hide game screen and show results
            gameScreen.classList.add('hidden');
            resultsScreen.classList.remove('hidden');
            showResults();
        } else {
            // Remove temporary feedback elements
            const tempFeedbackContainer = document.getElementById('temp-feedback-container');
            if (tempFeedbackContainer) {
                tempFeedbackContainer.innerHTML = '';
            }
            
            // Re-enable choice buttons
            topButton.disabled = false;
            bottomButton.disabled = false;
            
            // Show the next topic
            showCurrentTopic();
        }
    }

    // Show the results screen
    function showResults() {
        const totalTopics = gameData.topics.length;
        const percentage = Math.round((gameData.score / totalTopics) * 100);
        
        finalScore.textContent = `Sait ${gameData.score}/${totalTopics} pistettä.`;
        finalPercentage.textContent = `Onnistumisprosentti: ${percentage}%`;
    }

    // Restart the game
    function restartGame() {
        // Prepare topics (shuffle if enabled)
        prepareTopics();
        
        // Reset game state
        gameData.currentTopicIndex = 0;
        gameData.score = 0;
        
        // Show the start screen
        resultsScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }
    
    // Prepare topics based on configuration
    function prepareTopics() {
        if (gameData.customOrder && gameData.customOrder.length > 0) {
            // Use custom order if provided
            // Filter to include only topics that exist in answers AND have valid images
            const validCustomOrder = gameData.customOrder.filter(topic => 
                gameData.answers[topic] && gameData.topics.includes(topic)
            );
            
            if (validCustomOrder.length > 0) {
                gameData.topics = validCustomOrder;
                console.log("Using custom topic order:", gameData.topics);
                return;
            } else {
                console.warn("Custom order contains no valid topics, falling back to default order");
            }
        }
        
        if (gameData.shuffleTopics) {
            // Shuffle topics if randomization is enabled
            shuffleArray(gameData.topics);
            console.log("Using shuffled topic order:", gameData.topics);
        } else {
            // Using default order from correct_answers.json
            console.log("Using default topic order:", gameData.topics);
        }
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
