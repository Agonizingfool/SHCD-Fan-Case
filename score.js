/**
 * Displays the solution narrative, Holmes' summary, and the points breakdown
 * for the "An Ember of Distraction" case.
 */
async function solveCase() {
    try {
        // Ensure caseData is loaded (assuming it's global or accessible)
        if (!caseData || !caseData.outro || !caseData.case_summary) {
            console.error("Case introduction or summary data not loaded.");
            // Attempt to load it if not present
            try {
                const caseIntroResponse = await fetch("caseIntro.json");
                if (!caseIntroResponse.ok) throw new Error(`HTTP error! status: ${caseIntroResponse.status}`);
                caseData = await caseIntroResponse.json();
                console.log("Case data loaded within solveCase.");
            } catch (loadError) {
                console.error("Failed to load caseIntro.json within solveCase:", loadError);
                document.getElementById("current-text").innerHTML = "<p>Error loading case conclusion data. Please try again.</p>";
                return; // Stop execution if essential data is missing
            }
        }

        // --- Define Point Values Per Question (from PDF) ---
        const points = {
            q1: 10, // Orphanage fire part of series? NO
            q2: 30, // Other crime? Impersonation
            q3: 30, // Corroboration? Gallimore & William Bros
            q4: 30, // Why burn orphanage? Destroy records
            q5: 15, // Who set London fires? Jack Rowney
            q6: 15, // Who paid him? Sir George Lewis
            q7: 20  // Why? Profit from bridge land purchase
        };
        const HOLMES_LEADS = 4; // From PDF

        // --- Point Breakdown Explanation ---
        let pointsExplanation = [];
        pointsExplanation.push("<h4>Points Breakdown:</h4>");
        pointsExplanation.push(`<li>Question 1 Correct: ${points.q1} points</li>`);
        pointsExplanation.push(`<li>Question 2 Correct: ${points.q2} points</li>`);
        pointsExplanation.push(`<li>Question 3 Correct: ${points.q3} points</li>`);
        pointsExplanation.push(`<li>Question 4 Correct: ${points.q4} points</li>`);
        pointsExplanation.push(`<li>Question 5 Correct: ${points.q5} points</li>`);
        pointsExplanation.push(`<li>Question 6 Correct: ${points.q6} points</li>`);
        pointsExplanation.push(`<li>Question 7 Correct: ${points.q7} points</li>`);
        const totalPointsPossible = Object.values(points).reduce((sum, p) => sum + p, 0);
        pointsExplanation.push(`<li><strong>Total Possible Points: ${totalPointsPossible}</strong></li>`);


        // --- Display Setup ---
        const formattedOutro = caseData.outro ? caseData.outro.replace(/\n/g, "<br>") : "Outro text not found.";
        // Use the case_summary leads if available, otherwise default to PDF
         const holmesLeadsList = caseData.case_summary?.leads?.map(lead => `<li>${lead.name}</li>`).join('') ||
             `<li>44 NW (Orphanage Fire/Clues)</li><li>46 NW (Madame Tussauds/Orphans)</li><li>73 NW (Goodwin Residence/Butler)</li><li>22 NW (St James Hall/Gallimore)</li>`; // Fallback to PDF leads
        const caseDescription = caseData.case_summary?.case_description || `Holmes solved this case in ${HOLMES_LEADS} leads.`;

        // --- Holmes' Summary ---
        const holmesSummaryHTML = `
            <h3>Holmes' Solution</h3>
            <p>${caseDescription}</p>
            <ul>${holmesLeadsList}</ul>
            <p>He scored 100 points.</p>
            <p><em>(Note: The PDF states Holmes scored 100, though the sum of question points is 150. This reflects the original game scoring.)</em></p>`; // Added note about scoring discrepancy

        // --- Final Result Display ---
        // Removed player score calculation, focusing on presenting the solution and point structure
        const resultText = `
            <div class="results">
                <h3>Solution Narrative</h3>
                <div class="outro-text">${formattedOutro}</div>
                <hr>
                 ${holmesSummaryHTML}
                <hr>
                <h3>Case Scoring</h3>
                 <p>Total Leads Followed by Player: ${gameState.leadsCount}</p> <div class="score-breakdown">
                     <ul>${pointsExplanation.join('')}</ul>
                </div>
                <hr style="border-top: 2px solid var(--primary); margin: 20px 0;">
                 <p>Compare your leads to Holmes's ${HOLMES_LEADS} leads. Each lead taken over ${HOLMES_LEADS} deducts 5 points from the total possible score.</p>
                 <hr style="border-top: 2px solid var(--primary); margin: 20px 0;">
            </div>`;

        document.getElementById("current-text").innerHTML = resultText;
        document.getElementById("options").innerHTML = ''; // Clear options/actions area

    } catch (error) {
        console.error("Error solving the case:", error);
        document.getElementById("current-text").innerHTML = "<p>Error displaying the case conclusion. Please check the console.</p>";
    }
}

