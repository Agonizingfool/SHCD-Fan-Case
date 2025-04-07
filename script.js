// Game state management - EXPANDED
const gameState = {
    visitedLocations: new Set(), // Tracks visited location addresses (e.g., "28 WC")
    letters: new Set(), // Tracks collected letters ('A', 'B', 'C')
    leadsCount: 0, // Tracks the number of leads followed
    flags: {}, // For tracking specific events/items (e.g., foundFruit: true, confirmedFootmanUniformMissing: true)
    currentLocation: null, // Keep track of the current location address being viewed
    lockedLocations: new Set() // Locations that cannot be revisited
};

// Store locations data globally
let gameLocations = {};
let caseData = {}; // To store caseIntro data

// --- Initialization ---
async function initializeGame() {
    await loadGameData(); // Load all necessary JSON
    showIntroduction(); // Show the game introduction
    updateLettersDisplay(); // Update the letters display
    updateLeadsCountDisplay(); // Initialize leads count display
}

async function loadGameData() {
    try {
        const [locationsResponse, caseIntroResponse] = await Promise.all([
            fetch("locations.json"),
            fetch("caseIntro.json") // Load intro data here as well
        ]);

        if (!locationsResponse.ok) throw new Error(`HTTP error! status: ${locationsResponse.status}`);
        if (!caseIntroResponse.ok) throw new Error(`HTTP error! status: ${caseIntroResponse.status}`);

        gameLocations = await locationsResponse.json();
        caseData = await caseIntroResponse.json(); // Store case data

        populateDropdown(); // Populate the dropdown menu with locations
        // Update title after loading case data
        if (caseData['case title']) {
            document.getElementById('case-title').textContent = caseData['case title'];
        }

    } catch (error) {
        console.error("Failed to load game data:", error);
        document.getElementById("current-text").innerHTML = "<p>Error loading game data. Please check console.</p>";
    }
}


// --- UI Updates ---

// --- MODIFIED populateDropdown function ---
function populateDropdown() {
    const dropdown = document.getElementById("locations-dropdown");
    dropdown.innerHTML = '<option value="">Select a location...</option>'; // Reset dropdown

    const locationsByDistrict = {};

    // 1. Group locations by district
    Object.keys(gameLocations).forEach(address => {
        const parts = address.split(' ');
        if (parts.length >= 2) {
            const district = parts[parts.length - 1].toUpperCase(); // Get district code (WC, SW, etc.)
            const number = parseInt(parts[0]); // Get the number part for sorting

            if (!locationsByDistrict[district]) {
                locationsByDistrict[district] = [];
            }
            // Store as objects for easier sorting
            locationsByDistrict[district].push({ address: address, number: number });
        } else {
             console.warn(`Could not parse district for address: ${address}`);
             // Optionally handle addresses without districts (e.g., add to an 'Other' group)
        }
    });

    // 2. Define the order districts should appear in the dropdown
    //    Adjust this array as needed for your desired order
    const districtOrder = ['WC', 'SW', 'NW', 'N', 'EC', 'E', 'SE', 'S']; // Example order

    // 3. Create optgroups and options in the desired order
    districtOrder.forEach(district => {
        if (locationsByDistrict[district]) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = district; // Set the group label (e.g., "WC")

            // Sort locations within the district numerically
            const sortedLocations = locationsByDistrict[district].sort((a, b) => a.number - b.number);

            // Create options for this group
            sortedLocations.forEach(locationInfo => {
                const option = document.createElement("option");
                option.value = locationInfo.address;
                option.textContent = locationInfo.address; // Display the full address

                // Add styling for visited/locked locations
                if (gameState.visitedLocations.has(locationInfo.address)) {
                    option.classList.add("visited-location");
                }
                if (gameState.lockedLocations.has(locationInfo.address)) {
                    option.disabled = true;
                    option.classList.add("locked-location");
                }
                optgroup.appendChild(option); // Add the option to the group
            });

            dropdown.appendChild(optgroup); // Add the group to the dropdown
        }
    });

     // Optionally, add any locations that couldn't be grouped (if handled)
     // Example: if you created an 'Other' group for addresses without districts
     /*
     if (locationsByDistrict['Other'] && locationsByDistrict['Other'].length > 0) {
         const optgroup = document.createElement('optgroup');
         optgroup.label = 'Other';
         // Sort and add options for 'Other' group...
         dropdown.appendChild(optgroup);
     }
     */
}
// --- END MODIFIED populateDropdown function ---

function updateLettersDisplay() {
    // Updated array to include all letters from locations.json
    ["B", "C", "E", "F", "G", "H", "R", "T"].forEach((letter) => {
        const letterElement = document.getElementById(`letter-${letter}`);
        if (!letterElement) {
             // This warning is important if you forgot a letter div in index.html
             console.warn(`Letter element not found in HTML: letter-${letter}`);
             return;
        }
        // Check if the letter exists in the game state's Set
        if (gameState.letters.has(letter)) {
            letterElement.classList.add("found"); // Add .found class if present
        } else {
            letterElement.classList.remove("found"); // Remove .found class if not present
        }
    });
}

function updateLeadsCountDisplay() {
    const leadsCountElement = document.getElementById("leads-count");
    if (leadsCountElement) {
        leadsCountElement.textContent = gameState.leadsCount;
    }
}

// --- Core Logic ---

// *** NEW: Helper function to process text for image placeholders -> buttons ***
function processTextForImageButtons(rawText) {
    if (!rawText) return "";
    const textWithoutCitations = rawText.replace(/\[cite: \d+\]/g, "");
    const replacements = [
        {
            placeholder: "(Image: Pawn Slip Fragment)",
            buttonHTML: '<button onclick="openImage(\'media/images/clue.png\')" style="margin: 5px 0; padding: 6px 12px;">Burn piece of paper</button>' // Added padding
        }
    ];

    let processedHTML = textWithoutCitations;

    // Apply replacements
    replacements.forEach(rep => {
        const escapedPlaceholder = rep.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPlaceholder, 'g');
        // Wrap button in paragraph for spacing and block display
        processedHTML = processedHTML.replace(regex, `<p style="text-align: center;">${rep.buttonHTML}</p>`);
    });

    // Handle line breaks and wrap remaining text in paragraphs more carefully
    processedHTML = processedHTML.split('\n')
                               .map(line => line.trim()) // Trim whitespace
                               .map(line => {
                                    // If the line now solely contains the button paragraph we added, return it as is
                                    if (line.startsWith('<p style="text-align: center;"><button') && line.endsWith('</button></p>')) {
                                        return line;
                                    }
                                    // If it's an empty line after processing, skip it
                                    if (line.length === 0) {
                                        return null; // Filter this out later
                                    }
                                    // Otherwise, wrap in <p>, handle <br>
                                    return `<p>${line.replace(/<br>\s*<br>/g, '</p><p>').replace(/<br>/g, '\n').replace(/\n/g, '<br>')}</p>`;
                                })
                               .filter(line => line !== null) // Remove null entries (empty lines)
                               .join(''); // Join without extra spaces

    return processedHTML;
}

function handleLocationSelect(address) {
    if (!address) return;
    visitLocation(address);
    // Reset dropdown selection after visiting
    const dropdown = document.getElementById("locations-dropdown");
    if (dropdown) dropdown.value = "";
}

// VISIT LOCATION FUNCTION (Using Image Button Helper)
async function visitLocation(address) {
    if (gameState.lockedLocations.has(address)) {
        showNotification(`You cannot return to ${address}.`, 'error');
        return;
    }

    const locationData = gameLocations[address];
    if (!locationData) {
        console.error(`Location data not found for: ${address}`);
        return;
    }

    console.log(`Visiting: ${address}`, locationData);

    gameState.currentLocation = address;

    // --- Lead Counting ---
    const freeLeads = ["35 NW", "45 NW", "80 NW", "81 NW", "82 NW", "83 NW"];
    if (!gameState.visitedLocations.has(address)) {
        if (!freeLeads.includes(address)) {
            gameState.leadsCount++;
            updateLeadsCountDisplay();
        } else {
            showNotification(`${address} is a free lead.`, 'info');
        }
        gameState.visitedLocations.add(address);
        const dropdownOption = document.querySelector(`#locations-dropdown option[value="${address}"]`);
        if (dropdownOption) {
            dropdownOption.classList.add("visited-location");
        }
    }
    // --- End Lead Counting ---

    // --- Display Logic ---
    const currentTextDiv = document.getElementById("current-text");
    const optionsDiv = document.getElementById("options");
    if (!currentTextDiv || !optionsDiv) {
        console.error("Required display elements not found.");
        return;
    }
    optionsDiv.innerHTML = ''; // Clear options

    // --- Top Level Letter Granting ---
    if (locationData.circlesLetter && !gameState.letters.has(locationData.circlesLetter)) {
        gameState.letters.add(locationData.circlesLetter);
        showNotification(`Found Letter ${locationData.circlesLetter}!`, 'success');
        updateLettersDisplay();
    }

    // --- Display Initial Text (processed for image buttons) ---
    let initialTextHTML = `<h1 style="text-align: center;">${address}</h1>`;
    const rawInitialText = locationData.text || locationData.baseText || "";
    initialTextHTML += processTextForImageButtons(rawInitialText); // Use helper
    currentTextDiv.innerHTML = initialTextHTML;

    // --- Process Top-Level Updates ---
    if (locationData.updates) {
        console.log(`Applying top-level updates for ${address}:`, locationData.updates);
        if (locationData.updates.circlesLetter && !gameState.letters.has(locationData.updates.circlesLetter)) {
             gameState.letters.add(locationData.updates.circlesLetter);
             showNotification(`Found Letter ${locationData.updates.circlesLetter}`, 'success');
             updateLettersDisplay();
        }
        const flagsToMerge = { ...locationData.updates };
        delete flagsToMerge.circlesLetter;
        Object.assign(gameState.flags, flagsToMerge);
        console.log("Updated gameState.flags after top-level update:", gameState.flags);
    }

    // --- Render Top-Level Actions ---
     if (locationData.actions && locationData.actions.length > 0) {
          console.log(`Rendering top-level actions for ${address}`);
          locationData.actions.forEach(action => renderAction(action, optionsDiv));
     }

    // --- Process Conditions/FollowUps ---
    if (locationData.conditions && locationData.conditions.length > 0) {
         console.log(`Processing conditions for ${address}`);
        await processConditionsAndActions(locationData.conditions, currentTextDiv, optionsDiv);
    } else if (locationData.conditionalText && locationData.conditionalText.length > 0) {
        console.warn(`Location ${address} uses deprecated 'conditionalText'.`);
        await processOldConditionalText(locationData.conditionalText, currentTextDiv, optionsDiv);
    } else if (locationData.followUpConditions && locationData.followUpConditions.length > 0 && !(locationData.actions && locationData.actions.length > 0)) {
        console.log(`Processing top-level followUpConditions for ${address}`);
        await processConditionsAndActions(locationData.followUpConditions, currentTextDiv, optionsDiv);
    }
}


// --- THIS IS THE NEW processConditionsAndActions BLOCK ---

// processConditionsAndActions function (MODIFIED to hide specific 73 NW prompts)
async function processConditionsAndActions(conditions, displayElement, optionsElement) {
    let overallSuccess = false;
    let collectedActions = [];

    // --- NO LONGER NEEDED ---
    // function hide73NWPrompts() { ... }
    // --- END NO LONGER NEEDED ---

    for (const condition of conditions) {
        let conditionMet = false;

        // --- Check condition ---
        if (condition.check === "requiresLetter") {
            conditionMet = gameState.letters.has(condition.letter);
        } else if (condition.check && condition.check.startsWith("flag:")) {
            const flagName = condition.check.substring(5);
            conditionMet = gameState.flags[flagName] === true;
        } else if (!condition.check) {
            conditionMet = true;
        } else {
            console.warn(`Unknown condition check type: ${condition.check}`);
            conditionMet = false;
        }

        // --- Handle result ---
        if (conditionMet) {
            overallSuccess = true;
            if (condition.onSuccess) {

                 // --- Process onSuccess.text (e.g., handles 'C' passage) ---
                 if (condition.onSuccess.text) {
                     if (displayElement.innerHTML.length > 0 &&
                         !displayElement.innerHTML.endsWith('<hr>') &&
                         !condition.onSuccess.text.trim().startsWith('<hr>'))
                     {
                         const lastChild = displayElement.lastElementChild;
                         if (lastChild && lastChild.tagName !== 'H1') {
                             displayElement.innerHTML += '<hr>';
                         }
                     }
                     const processedTextHTML = processTextForImageButtons(condition.onSuccess.text);
                     displayElement.innerHTML += processedTextHTML;

                     // ---> HIDE SPECIFIC PROMPT for 'C' condition <---
                     if (gameState.currentLocation === '73 NW' && condition.letter === 'C') {
                         const promptC = document.getElementById('prompt-73-c');
                         if (promptC) promptC.style.display = 'none';
                     }
                     // ---> END HIDE SPECIFIC PROMPT <---
                 }

                 // --- Apply onSuccess.updates ---
                 if (condition.onSuccess.updates) {
                     // ... (existing updates logic remains the same) ...
                     console.log(`Applying top-level updates:`, condition.onSuccess.updates);
                     if (condition.onSuccess.updates.circlesLetter && !gameState.letters.has(condition.onSuccess.updates.circlesLetter)) {
                         gameState.letters.add(condition.onSuccess.updates.circlesLetter);
                         showNotification(`Found Letter ${condition.onSuccess.updates.circlesLetter}!`, 'success');
                         updateLettersDisplay();
                     }
                     Object.keys(condition.onSuccess.updates).forEach(key => {
                         if (key !== 'circlesLetter') {
                             gameState.flags[key] = condition.onSuccess.updates[key];
                         }
                     });
                     console.log("Updated flags:", gameState.flags);
                 }

                 // --- Process onSuccess.followUpConditions (e.g., handles 'G' check leading to 'T' check) ---
                 if (condition.onSuccess.followUpConditions && condition.onSuccess.followUpConditions.length > 0) {
                    for (const followUpCondition of condition.onSuccess.followUpConditions) {
                         let followUpMet = false;
                         // Evaluate followUpCondition.check
                         if (followUpCondition.check === "requiresLetter") {
                             followUpMet = gameState.letters.has(followUpCondition.letter);
                         } // Add other check types if needed

                         if (followUpMet) {
                              // --- Process nested onSuccess (e.g., handles 'T&G' passage) ---
                              if (followUpCondition.onSuccess) {
                                   if (followUpCondition.onSuccess.text) {
                                       // ... (Add <hr> logic if needed) ...
                                       const processedFollowUpSuccessHTML = processTextForImageButtons(followUpCondition.onSuccess.text);
                                       displayElement.innerHTML += processedFollowUpSuccessHTML;

                                       // ---> HIDE SPECIFIC PROMPTS for 'T&G' condition <---
                                       if (gameState.currentLocation === '73 NW') {
                                           // Hide the T&G prompt AND the G not T prompt
                                           const promptTG = document.getElementById('prompt-73-tg');
                                           if (promptTG) promptTG.style.display = 'none';
                                           const promptGnotT = document.getElementById('prompt-73-g_not_t');
                                           if (promptGnotT) promptGnotT.style.display = 'none';
                                       }
                                       // ---> END HIDE SPECIFIC PROMPTS <---
                                   }
                                   // Apply nested updates/actions here...
                                   if (followUpCondition.onSuccess.updates /*... apply updates ...*/) {}
                                   if (followUpCondition.onSuccess.actions) { collectedActions = collectedActions.concat(followUpCondition.onSuccess.actions); }
                              }
                         } else { // followUpCondition failed
                              // --- Process nested promptIfFalse (e.g., handles 'G not T' passage) ---
                              if (followUpCondition.promptIfFalse) {
                                   const followUpFailureTextRaw = followUpCondition.promptIfFalse;
                                   if (typeof followUpFailureTextRaw === 'string' && followUpFailureTextRaw.trim() !== '') {
                                       // ... (Add <hr> logic if needed) ...
                                       let processedFollowUpPromptHTML = processTextForImageButtons(followUpFailureTextRaw);
                                        if (!processedFollowUpPromptHTML.trim().startsWith('<')) {
                                             processedFollowUpPromptHTML = `<p><em>${processedFollowUpPromptHTML}</em></p>`;
                                        }
                                       displayElement.innerHTML += processedFollowUpPromptHTML;

                                        // ---> HIDE SPECIFIC PROMPT for 'G not T' condition <---
                                       if (gameState.currentLocation === '73 NW') {
                                           const promptGnotT = document.getElementById('prompt-73-g_not_t');
                                           if (promptGnotT) promptGnotT.style.display = 'none';
                                           // Do NOT hide T&G prompt here, as T condition wasn't met
                                       }
                                       // ---> END HIDE SPECIFIC PROMPT <---
                                   }
                              }
                         } // End else for followUpMet
                    } // End loop for followUpConditions
                 } // End if followUpConditions exist

                 // --- Collect onSuccess.actions (top level) ---
                 if (condition.onSuccess.actions) {
                     collectedActions = collectedActions.concat(condition.onSuccess.actions);
                 }

            } // End if condition.onSuccess exists
        } else { // Condition failed (Top Level)
             // --- Process top-level promptIfFalse ---
             if (condition.promptIfFalse) {
                 const failureTextRaw = condition.promptIfFalse;
                 // Check if promptIfFalse contains actual text
                 if (typeof failureTextRaw === 'string' && failureTextRaw.trim() !== '') {
                     if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>')) {
                          const lastElement = displayElement.querySelector(':scope > *:last-child');
                          if (!lastElement || (lastElement.tagName !== 'H1' && !(lastElement.tagName === 'P' && lastElement.querySelector('em')))) {
                              displayElement.innerHTML += '<hr>';
                          }
                     }
                      let processedPromptHTML = processTextForImageButtons(failureTextRaw);
                      if (!processedPromptHTML.trim().startsWith('<')) {
                           processedPromptHTML = `<p><em>${processedPromptHTML}</em></p>`;
                      }
                     displayElement.innerHTML += processedPromptHTML;
                     // NOTE: Do NOT hide any prompts here, as this is the failure case displaying a prompt.
                 }
             }
        } // End else for conditionMet

    } // End loop through 'conditions' array


    // --- Render collected actions ---
    if (collectedActions.length > 0) {
        // ... (existing logic to add HR and render buttons - no changes needed here) ...
        if (optionsElement.innerHTML !== '' && !optionsElement.innerHTML.endsWith('</hr>') && !optionsElement.innerHTML.endsWith('</button>')) {
            const lastButton = optionsElement.querySelector('button:last-of-type');
            if (lastButton || optionsElement.innerHTML.includes('<p>')) optionsElement.innerHTML += '<hr style="margin-top: 15px;">';
        }
        collectedActions.forEach(action => {
            renderAction(action, optionsElement);
        });
    }

    return overallSuccess;
}


// processOldConditionalText function (Using Image Button Helper)
async function processOldConditionalText(conditionalTextArray, displayElement, optionsElement) {
    if (!conditionalTextArray || !Array.isArray(conditionalTextArray)) {
        console.error("Invalid conditionalTextArray passed");
        return;
    }

    let collectedActions = [];
    let addedSeparator = false;

    conditionalTextArray.forEach(condition => {
        let conditionMet = false;
        if (!condition.requiresLetter || gameState.letters.has(condition.requiresLetter)) {
            conditionMet = true;
        } else if (condition.requiresFlag && gameState.flags[condition.requiresFlag]) {
            conditionMet = true;
        }

        if (conditionMet) {
            // Add text, process for images
             if (condition.text) {
                 const textRaw = condition.text;
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>')) {
                      const lastElement = displayElement.querySelector(':scope > *:last-child');
                     if (!lastElement || lastElement.tagName !== 'P') {
                         displayElement.innerHTML += '<hr>';
                         addedSeparator = true;
                     }
                 }
                 displayElement.innerHTML += processTextForImageButtons(textRaw); // Use helper
             }
             // Add prompt, process for images
             if (condition.prompt && !condition.text) {
                 const promptTextRaw = condition.prompt;
                 if (promptTextRaw.trim() !== '') {
                      if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
                            const lastElement = displayElement.querySelector(':scope > *:last-child');
                           if (!lastElement || (lastElement.tagName !== 'P' || !lastElement.querySelector('em'))) {
                             displayElement.innerHTML += '<hr>';
                             addedSeparator = true;
                           }
                      }
                      let processedPromptHTML = processTextForImageButtons(promptTextRaw);
                       processedPromptHTML = processedPromptHTML.replace(/<p>(.*?)<\/p>/gs, (match, content) => content ? `<p><em>${content}</em></p>` : '');
                       if (!processedPromptHTML.includes('<p>')) { processedPromptHTML = `<p><em>${processedPromptHTML}</em></p>`;}
                      displayElement.innerHTML += processedPromptHTML;
                 }
             }

            // Handle updates
            const updates = condition.updatesGameState || condition.updates;
            if (updates) {
                 console.warn(`Applying updates from deprecated 'conditionalText'.`, updates);
                 Object.assign(gameState.flags, updates);
                 if (updates.circlesLetter && !gameState.letters.has(updates.circlesLetter)) {
                     gameState.letters.add(updates.circlesLetter);
                     showNotification(`Found Letter ${updates.circlesLetter}!`, 'success');
                     updateLettersDisplay();
                     delete gameState.flags.circlesLetter;
                 }
                 console.log("Updated flags from old conditionalText:", gameState.flags);
            }

            // Handle lock
            if (condition.locationLock && !gameState.lockedLocations.has(gameState.currentLocation)) {
                gameState.lockedLocations.add(gameState.currentLocation);
                showNotification(`${gameState.currentLocation} is now locked.`, 'info');
                populateDropdown();
            }

            // Collect actions
            if (condition.actions) {
                collectedActions = collectedActions.concat(condition.actions);
            }
        } else { // Condition Failed
            const failurePromptRaw = condition.promptIfFalse || condition.prompt;
             if (failurePromptRaw && failurePromptRaw.trim() !== '') {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>') && !addedSeparator) {
                      const lastElement = displayElement.querySelector(':scope > *:last-child');
                     if (!lastElement || (lastElement.tagName !== 'P' || !lastElement.querySelector('em'))) {
                         displayElement.innerHTML += '<hr>';
                         addedSeparator = true;
                     }
                 }
                  let processedPromptHTML = processTextForImageButtons(failurePromptRaw);
                   processedPromptHTML = processedPromptHTML.replace(/<p>(.*?)<\/p>/gs, (match, content) => content ? `<p><em>${content}</em></p>` : '');
                   if (!processedPromptHTML.includes('<p>')) { processedPromptHTML = `<p><em>${processedPromptHTML}</em></p>`;}
                 displayElement.innerHTML += processedPromptHTML;
             }
        }
    }); // End loop

    // Render actions
    if (collectedActions.length > 0) {
        if (optionsElement.innerHTML !== '' && !optionsElement.innerHTML.endsWith('</hr>') && !optionsElement.innerHTML.endsWith('</button>')) {
            const lastButton = optionsElement.querySelector('button:last-of-type');
            if (lastButton || optionsElement.innerHTML.includes('<p>')) optionsElement.innerHTML += '<hr style="margin-top: 15px;">';
        }
        collectedActions.forEach(action => {
            renderAction(action, optionsElement);
        });
    }
}


// renderAction function (No changes needed here for image button logic)
function renderAction(action, optionsElement) {
    if (!action || !action.id || !action.text) return;

     const buttonText = action.text.replace(/\[cite: \d+\]/g, "");

    if (action.hideIfFlag && gameState.flags[action.hideIfFlag]) {
        console.log(`Hiding action '${action.id}'`);
        return;
    }

    if (action.choices && action.choices.length > 0) {
         if (optionsElement.innerHTML !== '' && !optionsElement.innerHTML.endsWith('<hr>')) {
             optionsElement.innerHTML += '<hr>';
         }
         if (!(action.hidePromptIfFlag && gameState.flags[action.hidePromptIfFlag])) {
              const promptText = buttonText;
             optionsElement.innerHTML += `<p>${promptText.replace(/\n/g, "<br>")}</p>`;
         }

        action.choices.forEach(choice => {
            if (choice.hideIfFlag && gameState.flags[choice.hideIfFlag]) {
                 console.log(`Hiding choice '${choice.id}'`);
                 return;
            }
             const choiceButtonText = choice.text.replace(/\[cite: \d+\]/g, "");
            const choiceButton = document.createElement('button');
            choiceButton.textContent = choiceButtonText;
            choiceButton.onclick = () => handleAction(choice.id, choice.consequences || action.consequences || {});

            if (gameState.currentLocation === '68 WC' && action.id === 'choose_burn_item_68wc' && gameState.flags.burnedOneUniformChoice_68wc) {
                choiceButton.disabled = true;
                choiceButton.style.opacity = '0.5';
            }
            if (choice.disableIfFlag && gameState.flags[choice.disableIfFlag]) {
                 choiceButton.disabled = true;
                 choiceButton.style.opacity = '0.5';
                 choiceButton.title = choice.disabledText || "Unavailable.";
            }
            optionsElement.appendChild(choiceButton);
        });
    } else {
        const button = document.createElement('button');
        button.textContent = buttonText;
        button.onclick = () => handleAction(action.id, action.consequences || {});

        if (action.id === 'attempt_break_in_68wc' && gameState.lockedLocations.has('68 WC')) {
            button.disabled = true;
            button.style.opacity = '0.5';
        }
        if (action.disableIfFlag && gameState.flags[action.disableIfFlag]) {
             button.disabled = true;
             button.style.opacity = '0.5';
             button.title = action.disabledText || "Unavailable.";
        }
         if (action.id.startsWith("hint_")) {
             const letter = action.id.split("_")[1].toUpperCase();
             const hintFlag = `hint_${letter}_taken`;
             if (gameState.flags[hintFlag]) {
                  button.disabled = true;
                  button.style.opacity = '0.5';
                  button.title = "Hint already taken.";
             }
         }
        optionsElement.appendChild(button);
    }
}


// handleAction function (Updated for Hints)
async function handleAction(actionId, consequences = {}) {
    console.log(`Action triggered: ${actionId} at location ${gameState.currentLocation}`);
    console.log(`Consequences:`, consequences);

    let needsReRender = false;
    const displayElement = document.getElementById("current-text");

    // --- Hint Logic ---
    if (actionId.startsWith("hint_")) {
        const requiredLetter = actionId.split("_")[1].toUpperCase();
        const hintFlag = `hint_${requiredLetter}_taken`;
        if (gameState.flags[hintFlag]) {
             showNotification(`You have already taken Hint ${requiredLetter}.`, 'error');
             return;
        }
        if (gameState.letters.has(requiredLetter)) {
            let hintText = "";
            if (requiredLetter === 'F') hintText = "Hint (F): \"Having difficulty finding our racing miscreant? Have you considered that where he is going is less important than where he has been? Even less important than who he actually is, in my opinion.\"";
            else if (requiredLetter === 'T') hintText = "Hint (T): \"Have you spoken to the formidable woman who runs the orphanage? If not, I suggest you locate her quickly. If you are struggling to identify those items you are carrying, perhaps our friend H.R. Murray can set you on the correct path.\"";
            else if (requiredLetter === 'G') hintText = "Hint (G): \"I fear you will struggle if you are attempting to locate Lord Goodwin; if you look in the newspaper you will find that he passed away last week. Now ask yourself; is someone trying to impersonate Lord Harold Goodwin, or are they trying to achieve something else?\"";

            if (hintText && displayElement) {
                if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>')) displayElement.innerHTML += '<hr>';
                let processedHintHTML = processTextForImageButtons(hintText); // Process hint text too
                 processedHintHTML = processedHintHTML.replace(/<p>(.*?)<\/p>/gs, (match, content) => content ? `<p><em>${content}</em></p>` : '');
                 if (!processedHintHTML.includes('<p>')) { processedHintHTML = `<p><em>${processedHintHTML}</em></p>`;}
                displayElement.innerHTML += processedHintHTML;

                gameState.leadsCount++;
                updateLeadsCountDisplay();
                gameState.flags[hintFlag] = true;
                showNotification(`Hint ${requiredLetter} taken. Lead count increased.`, 'info');
                needsReRender = true;
            }
        } else {
            showNotification(`You need letter ${requiredLetter} circled to get this hint.`, 'error');
            return;
        }
    }
    // --- End Hint Logic ---
    else { // --- General Consequences ---
        if (consequences.setsFlag) {
            Object.keys(consequences.setsFlag).forEach(flagName => {
                gameState.flags[flagName] = consequences.setsFlag[flagName];
                console.log(`Flag set: <span class="math-inline">\{flagName\}\=</span>{gameState.flags[flagName]}`);
                needsReRender = true;
            });
        }
        if (consequences.locksLocation) {
            if (!gameState.lockedLocations.has(gameState.currentLocation)) {
                gameState.lockedLocations.add(gameState.currentLocation);
                showNotification(`${gameState.currentLocation} is now locked.`, 'info');
                populateDropdown();
                needsReRender = true;
            }
        }
        if (consequences.recordsChoice) {
            if (gameState.currentLocation === '68 WC' && actionId.startsWith("burn_")) {
                if (!gameState.flags.burnedOneUniformChoice_68wc) {
                    gameState.flags[consequences.recordsChoice] = actionId;
                    gameState.flags.burnedOneUniformChoice_68wc = true;
                    const uniformType = actionId.split('_')[1] || 'item';
                    showNotification(`You chose to burn the ${uniformType} uniform.`, 'info');
                    needsReRender = true;
                } else {
                    showNotification(`You already made a choice here.`, 'error');
                    return;
                }
            }
        }
        if (consequences.addsText) {
            if (displayElement) {
                 if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>')) displayElement.innerHTML += '<hr>';
                 displayElement.innerHTML += processTextForImageButtons(consequences.addsText); // Use helper
            }
        }
        if (consequences.triggersSequence) {
            await displaySequence(consequences.triggersSequence);
             if (needsReRender) await visitLocation(gameState.currentLocation); // Refresh after sequence
            return;
        }
        if (consequences.endsInteraction) {
             document.getElementById("options").innerHTML = '';
             if (!consequences.addsText && !consequences.triggersSequence) {
                  document.getElementById("options").innerHTML = '<button onclick="showIntroduction()">Leave</button>';
             }
        }
    } // --- End General Consequences ---

    // --- Re-render Actions ---
     const interactionContinues = !consequences || consequences.endsInteraction !== true;
    if (needsReRender && interactionContinues && !consequences.triggersSequence) {
        const optionsDiv = document.getElementById("options");
        if (optionsDiv && gameLocations[gameState.currentLocation]) {
            console.log("Re-rendering actions...");
            optionsDiv.innerHTML = '';
            const locationData = gameLocations[gameState.currentLocation];
            if (locationData.actions) {
                 locationData.actions.forEach(action => renderAction(action, optionsDiv));
            }
            // Add re-evaluation logic for conditional actions if necessary
            // else if (locationData.conditions) { await processConditionsAndActions(locationData.conditions, displayElement, optionsDiv); } ... etc.
        }
    }
}


// displaySequence function (Using Image Button Helper)
async function displaySequence(sequenceId) {
    console.log(`Displaying sequence: ${sequenceId}`);
    const locationData = gameLocations[gameState.currentLocation];
    if (!locationData || !locationData.sequences || !locationData.sequences[sequenceId]) {
        console.error(`Sequence ${sequenceId} not found`);
        return;
    }

    const sequence = locationData.sequences[sequenceId];
    const displayElement = document.getElementById("current-text");
    const optionsElement = document.getElementById("options");
    if (!displayElement || !optionsElement) return;

    // Append sequence text, process for images
    if (sequence.text) {
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>')) displayElement.innerHTML += '<hr>';
        displayElement.innerHTML += processTextForImageButtons(sequence.text); // Use helper
    }

    // Apply sequence updates
    if (sequence.updates) {
        console.log(`Applying sequence updates:`, sequence.updates);
        Object.keys(sequence.updates).forEach(key => {
             if (key === 'circlesLetter' && !gameState.letters.has(sequence.updates[key])) {
                 gameState.letters.add(sequence.updates[key]);
                 showNotification(`Found Letter ${sequence.updates[key]}!`, 'success');
                 updateLettersDisplay();
             } else if (key !== 'circlesLetter') {
                 gameState.flags[key] = sequence.updates[key];
             }
        });
        console.log("Updated gameState:", gameState.flags, gameState.letters);
    }

    // Display sequence actions
    optionsElement.innerHTML = '';
    if (sequence.actions && sequence.actions.length > 0) {
        if (displayElement.innerHTML.length > 0 && !displayElement.innerHTML.endsWith('<hr>')) displayElement.innerHTML += '<hr>';
        sequence.actions.forEach(action => renderAction(action, optionsElement));
    } else if (sequence.endsInteraction !== false) {
         optionsElement.innerHTML = '<button onclick="showIntroduction()">Leave</button>';
    }
}


// --- Utility Functions ---
function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notifications') || createNotificationArea();
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    if (notificationArea.firstChild) {
         notificationArea.insertBefore(notification, notificationArea.firstChild);
    } else {
         notificationArea.appendChild(notification);
    }

    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s ease';
        notification.style.opacity = '0';
        setTimeout(() => {
             if (notification.parentNode === notificationArea) {
                 notificationArea.removeChild(notification);
             }
        }, 500);
    }, 3500);
}

function createNotificationArea() {
    const area = document.createElement('div');
    area.id = 'notifications';
    document.body.appendChild(area);
    return area;
}

// --- Display Functions ---
async function showIntroduction() {
    if (!caseData || !caseData.intro) {
        console.error("Introduction data not loaded.");
        document.getElementById("current-text").innerHTML = "<p>Error loading introduction.</p>";
        return;
    }
     const formattedIntro = caseData.intro ? caseData.intro.replace(/\[cite: \d+\]/g, "").replace(/\n/g, "<br>") : "";
     const formattedDate = caseData.date ? caseData.date.replace(/\[cite: \d+\]/g, "").replace(/\n/g, "<br>") : "";
    const introText = `${formattedDate ? `<div class="date">${formattedDate}</div>` : ''}<p>${formattedIntro}</p>`;
    const currentTextDiv = document.getElementById("current-text");
    const optionsDiv = document.getElementById("options");
    if (currentTextDiv) currentTextDiv.innerHTML = introText;
    if (optionsDiv) optionsDiv.innerHTML = '';
    gameState.currentLocation = null;
}

// --- Function to Show Credits (Revised Format) ---
async function showCredits() {
    try {
        // Fetch the credit data
        const response = await fetch('credit.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const credits = await response.json(); // Contains the credit information [cite: 1]

        // Start building the HTML string
        let creditsHTML = `<h1 style="text-align: center;">Credits</h1><hr style="margin-bottom: 20px;">`;

        // Game Credits Section
        creditsHTML += `<h2>Game Credits</h2>`; // Use <h2> for the section heading
        if (credits.case_writer) {
            creditsHTML += `<p><strong>Case Written By:</strong> ${credits.case_writer}</p>`; // [cite: 1]
        }
        if (credits.website_pdf) {
            // Make the PDF link clickable [cite: 1]
            creditsHTML += `<p><strong>Website&nbsp;PDF:</strong> <a href="${credits.website_pdf}" target="_blank">${credits.website_pdf}</a></p>`;
        }
        if (credits.bgg_account) {
            // Use the desired label "Creators BGG account" and make the link clickable [cite: 1]
            creditsHTML += `<p><strong>Creators BGG account:</strong> <a href="${credits.bgg_account}" target="_blank">${credits.bgg_account}</a></p>`;
        }

        // Web Adaptation Credits Section
        creditsHTML += `<h2 style="margin-top: 30px;">Web Adaptation Credits</h2>`; // Add some space before this section
        if (credits.website_creator?.name) {
            creditsHTML += `<p><strong>Created By:</strong> ${credits.website_creator.name}</p>`; // [cite: 1]
        }
        // Directly insert "CodeLifter" as requested, overriding the data from credit.json [cite: 1]
        creditsHTML += `<p><strong>Discord:</strong> CodeLifter</p>`;

        // Get the display elements
        const currentTextDiv = document.getElementById("current-text");
        const optionsDiv = document.getElementById("options");

        // Update the display
        if (currentTextDiv) {
            currentTextDiv.innerHTML = creditsHTML;
        }
        if (optionsDiv) {
            optionsDiv.innerHTML = ''; // Clear any action buttons
        }
        gameState.currentLocation = null; // Indicate we're not viewing a game location

    } catch (error) {
        console.error("Failed to load or display credits:", error);
        const currentTextDiv = document.getElementById("current-text");
        if (currentTextDiv) {
            currentTextDiv.innerHTML = "<p>Sorry, couldn't load credits.</p>";
        }
    }
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', initializeGame);

// --- Functions to open external files ---
const mapImagePath = 'media/images/Map.pdf';
const newspaperImagePath = 'media/images/newspaper.pdf';
const directoryPath = 'media/images/Directory.pdf';
const informantsPath = 'media/images/Informants.pdf';

function openMap() {
    if (mapImagePath && !mapImagePath.endsWith('map.jpg')) window.open(mapImagePath, '_blank');
    else alert("Map path not configured.");
}
function openNewspaper() {
    if (newspaperImagePath && !newspaperImagePath.endsWith('newspaper.jpg')) window.open(newspaperImagePath, '_blank');
    else alert("Newspaper path not configured.");
}
function openDirectory() {
    if (directoryPath) window.open(directoryPath, '_blank');
    else alert("Directory path not configured.");
}
function openInformants() {
    if (informantsPath) window.open(informantsPath, '_blank');
    else alert("Informants path not configured.");
}
// *** NEW: Function to open specific image ***
function openImage(imageUrl) {
    if (imageUrl) {
        window.open(imageUrl, '_blank');
    } else {
        console.error("No image URL provided to openImage function.");
    }
}

// --- Function to Show Questions ---
async function showQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const questionsData = await response.json();
        let questionsHTML = `<h1 style="text-align: center;">Case Questions</h1><hr style="margin-bottom: 20px;">`;
        if (questionsData.questions?.length) {
             questionsHTML += '<div id="questions-container">';
            questionsData.questions.forEach(q => {
                 const questionText = q.question ? q.question.replace(/\[cite: \d+\]/g, "") : "Question text missing.";
                 questionsHTML += `<div class="question" id="question-${q.id}" style="margin-bottom: 15px;"><p><strong>Question ${q.number}:</strong> ${questionText}</p></div>`;
            });
            questionsHTML += '</div>';
        } else {
            questionsHTML += `<p>No questions found.</p>`;
        }
        const currentTextDiv = document.getElementById("current-text");
        const optionsDiv = document.getElementById("options");
        if (currentTextDiv) currentTextDiv.innerHTML = questionsHTML;
        if (optionsDiv) optionsDiv.innerHTML = '';
        gameState.currentLocation = null;
    } catch (error) {
        console.error("Failed to load questions:", error);
        const currentTextDiv = document.getElementById("current-text");
        if (currentTextDiv) currentTextDiv.innerHTML = "<p>Sorry, couldn't load questions.</p>";
    }
}

// --- Function to Solve Case 
async function solveCase() {
    try {
        // Ensure caseData is loaded
        if (!caseData || !caseData.outro || !caseData.case_summary) {
            console.error("Case data not loaded. Attempting load...");
            await loadGameData();
            if (!caseData || !caseData.outro || !caseData.case_summary) {
                throw new Error("Failed to load case data for solveCase.");
            }
        }

        // Define points and Holmes's lead count
        const points = { q1: 10, q2: 30, q3: 30, q4: 30, q5: 15, q6: 15, q7: 20 }; // Still needed for total calculation
        const HOLMES_LEADS = caseData.case_summary?.holmesLeads || 4;

        // Calculate total possible points (still needed for the final instruction)
        const totalPointsPossible = Object.values(points).reduce((sum, p) => sum + p, 0);

        // Define the Answers List HTML (Using cleaned version)
        const answersListHTML = `
            <h3>Answers</h3>
            <ol style="list-style-position: inside; padding-left: 0; margin-left: 0;">
                <li>NO (10 points)</li>
                <li>Impersonating the long-lost son of Lord Harold Goodwin (30 points)</li>
                <li>Arthur Gallimore (from 22NW), and William Bros Pawnbrokers (from 7NW) (30 points)</li>
                <li>In order to destroy any records proving his lineage (30 points)</li>
                <li>Jack Rowney (15 points)</li>
                <li>Sir George Lewis MP (15 points)</li>
                <li>In order to buy the properties cheaply and profit from the compulsory purchase of land required to build the new bridge (Tower Bridge) (20 points)</li>
            </ol>
        `;

        // Prepare solution narrative
        const formattedOutro = (caseData.outro || "Outro text missing.")
            .replace(/\[cite: \d+\]/g, "")
            .replace(/\n/g, "<br>");

        // Prepare Holmes's solution details
        const holmesLeadsList = caseData.case_summary?.leads
            ?.map(lead => `<li>${lead.name.replace(/\[cite: \d+\]/g, "")}</li>`)
            .join('') || `<li>44 NW</li><li>46 NW</li><li>73 NW</li><li>22 NW</li>`; // Fallback
        const caseDescription = (caseData.case_summary?.case_description || `Holmes solved this case in ${HOLMES_LEADS} leads.`)
            .replace(/\[cite: \d+\]/g, "");

        // Construct Holmes's summary HTML
        const holmesSummaryHTML = `
            <h3>Holmes' Solution</h3>
            <p>${caseDescription}</p>
            <ul>${holmesLeadsList}</ul>
        `;

        // Calculate player lead penalty
        const leadsDifference = gameState.leadsCount - HOLMES_LEADS;
        const leadPenalty = leadsDifference > 0 ? leadsDifference * 5 : 0;

        // Construct the final result HTML (Swapping Points Breakdown for Answers List)
        const resultText = `
            <div class="results">
                <h3>Solution Narrative</h3>
                <div class="outro-text">${formattedOutro}</div>
                <hr>
                ${holmesSummaryHTML}
                <hr>
                <h3>Case Scoring</h3>
                <p>Total Leads Followed by Player: ${gameState.leadsCount}</p>

                ${answersListHTML}

            </div>
        `;

        // Update the display
        document.getElementById("current-text").innerHTML = resultText;
        document.getElementById("options").innerHTML = ''; // Clear action buttons

    } catch (error) {
        console.error("Error solving case:", error);
        document.getElementById("current-text").innerHTML = "<p>Error displaying conclusion.</p>";
    }
}