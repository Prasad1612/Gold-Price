document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const REFRESH_INTERVAL = 60000; // 1 minute
    const API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AY5xjrR0nHgnZSHTpauQgOlKkmhjsbYMUlyQ8ABYMTsxixkDK7TXTma7WPmKuAcxy-cPDkNqGhbzjsrwgnTBj8VvaYHHqbZds3psKJa6UKjryfOD2z1OIQ2_nsXD_vqSrt0hIFSHvyrrVDUSEUBiCimrphv7qaSSz20Dlcb2ZmPGpnUCcwQwiN2G-gq166_zcbR2c-TgUSoqp2BRYFae8iKggIkwoaZa72FbQgVpjlsFiFxvmFMpQRZGTNNOPhNPT-Li33vwYnHPohIGGyg3mmhnjUshYayVvA&lib=MGojfogA9ghirZ0wsR_Oq2NDoIZ1hlD_h';

    // --- Selectors ---
    const lastUpdatedDisplay = document.getElementById('last-updated');
    const fetchStatus = document.getElementById('fetch-status');
    const refreshBtn = document.getElementById('fetch-live-btn');

    // Inputs
    const goldSpotInput = document.getElementById('gold-spot');
    const silverSpotInput = document.getElementById('silver-spot');
    const usdInrInput = document.getElementById('usd-inr');
    const importDutyInput = document.getElementById('import-duty');
    const gstInput = document.getElementById('gst');
    const bankChargesInput = document.getElementById('bank-charges');
    const marginInput = document.getElementById('margin');

    // Comparison Inputs (Madurai)
    const localGold24kInput = document.getElementById('local-gold-24k');
    const localGold22kInput = document.getElementById('local-gold-22k');
    const localSilverInput = document.getElementById('local-silver');

    // Silver Selection
    const silverUnitSelect = document.getElementById('silver-unit-select');

    // Results
    const gold24kGramDisplay = document.getElementById('gold-24k-gram');
    const gold24k8gDisplay = document.getElementById('gold-24k-price');
    const diffGold24kDisplay = document.getElementById('diff-gold-24k');

    const gold22kGramDisplay = document.getElementById('gold-22k-gram');
    const gold22k8gDisplay = document.getElementById('gold-22k-price');
    const diffGold22kDisplay = document.getElementById('diff-gold-22k');

    const silverGramDisplay = document.getElementById('silver-gram');
    const silverUnitDisplay = document.getElementById('silver-price');
    const diffSilverDisplay = document.getElementById('diff-silver');

    const breakdownDetails = document.getElementById('breakdown-details');

    // --- State ---
    const TROY_OZ_TO_GRAMS = 31.1034768;
    let refreshTimer = null;

    // --- Helpers ---
    const formatINR = (amount, decimals = 0) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);
    };

    const updateDiffUI = (element, diffAmount) => {
        if (isNaN(diffAmount) || diffAmount === null) {
            element.textContent = '---';
            element.classList.remove('diff-positive', 'diff-negative');
            return;
        }

        const absAmount = Math.abs(diffAmount);
        const arrow = diffAmount >= 0 ? '↑' : '↓';
        const sign = diffAmount >= 0 ? '+' : '-';

        element.textContent = `${arrow} ${sign}₹${formatINR(absAmount, 2)}`;
        element.classList.remove('diff-positive', 'diff-negative');
        element.classList.add(diffAmount >= 0 ? 'diff-positive' : 'diff-negative');
    };

    // --- Scraping & Fetching ---
    const fetchAllData = async (fetchLocal = true) => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Updating...';
        fetchStatus.textContent = 'Fetching market rates...';

        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            goldSpotInput.value = data.xauusd;
            silverSpotInput.value = data.silver;
            usdInrInput.value = data.usdinr;

            if (fetchLocal) {
                localGold24kInput.value = data.last24k;
                localGold22kInput.value = data.last22k;
                localSilverInput.value = data.silverRetail;
            }

            // Update timestamp
            lastUpdatedDisplay.textContent = `Last update: ${data.time}`;
            fetchStatus.textContent = 'Rates updated - Next in 1 min';

            calculate();

        } catch (error) {
            console.error('Fetch error:', error);
            fetchStatus.textContent = 'Error updating live rates.';
            fetchStatus.style.color = '#ff6b6b';
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Now';
        }
    };

    // --- Calculation Core ---
    const calculate = () => {
        const goldSpot = parseFloat(goldSpotInput.value) || 0;
        const silverSpot = parseFloat(silverSpotInput.value) || 0;
        const usdInr = parseFloat(usdInrInput.value) || 0;
        const duty = parseFloat(importDutyInput.value) || 0;
        const gst = parseFloat(gstInput.value) || 0;
        const charges = parseFloat(bankChargesInput.value) || 0;
        const margin = parseFloat(marginInput.value) || 0;

        const silverUnit = parseFloat(silverUnitSelect.value) || 1;

        // 24K Gold
        const gold24kBase = (goldSpot / TROY_OZ_TO_GRAMS) * usdInr;
        const gold24kLanded = gold24kBase * (1 + (duty + charges) / 100);
        const gold24kRetailExGst = gold24kLanded * (1 + margin / 100);
        const gold24kFinal = gold24kRetailExGst * (1 + gst / 100);

        // 22K Gold
        const gold22kBase = gold24kBase * 0.9167;
        const gold22kLanded = gold24kLanded * 0.9167;
        const gold22kRetail = gold24kRetailExGst * 0.9167;
        const gold22kFinal = gold24kFinal * 0.9167;

        // Silver
        const silverBase = (silverSpot / TROY_OZ_TO_GRAMS) * usdInr;
        const silverLanded = silverBase * (1 + (duty + charges) / 100);
        const silverRetailExGst = silverLanded * (1 + margin / 100);
        const silverFinal = silverRetailExGst * (1 + gst / 100);

        // Get Local Values
        const local24k = parseFloat(localGold24kInput.value);
        const local22k = parseFloat(localGold22kInput.value);
        const localSilLimit = parseFloat(localSilverInput.value);

        // Update UI Results (Swapped: Big Font = Local, Small Font = Live)
        gold24kGramDisplay.textContent = local24k ? formatINR(local24k, 0) : '--';
        gold24k8gDisplay.textContent = local24k ? formatINR(local24k * 8, 0) : '--';

        gold22kGramDisplay.textContent = local22k ? formatINR(local22k, 0) : '--';
        gold22k8gDisplay.textContent = local22k ? formatINR(local22k * 8, 0) : '--';

        silverGramDisplay.textContent = localSilLimit ? formatINR(localSilLimit, 0) : '--';
        silverUnitDisplay.textContent = localSilLimit ? formatINR(localSilLimit * silverUnit, 0) : '--';

        document.getElementById('show-live-24k').textContent = formatINR(gold24kFinal, 2);
        document.getElementById('show-live-22k').textContent = formatINR(gold22kFinal, 2);
        document.getElementById('show-live-silver').textContent = formatINR(silverFinal, 2);

        updateDiffUI(diffGold24kDisplay, local24k ? gold24kFinal - local24k : null);
        updateDiffUI(diffGold22kDisplay, local22k ? gold22kFinal - local22k : null);
        updateDiffUI(diffSilverDisplay, localSilLimit ? silverFinal - localSilLimit : null);

        updateBreakdown(
            gold24kBase, gold24kLanded, gold24kRetailExGst, gold24kFinal,
            gold22kBase, gold22kLanded, gold22kRetail, gold22kFinal,
            silverBase, silverLanded, silverRetailExGst, silverFinal
        );
    };

    const updateBreakdown = (g24Base, g24Landed, g24Retail, g24Final, g22Base, g22Landed, g22Retail, g22Final, sBase, sLanded, sRetail, sFinal) => {
        breakdownDetails.innerHTML = `
            <div class="breakdown-section-gold gold-24k">
                <h4>GOLD (24K)</h4>
                <div class="breakdown-row"><span>Base Rate (Market)</span> <span class="val">₹${formatINR(g24Base, 2)}</span></div>
                <div class="breakdown-row"><span>+ Import & Charges</span> <span class="val">₹${formatINR(g24Landed - g24Base, 2)}</span></div>
                <div class="breakdown-row"><span>+ Dealer Margin</span> <span class="val">₹${formatINR(g24Retail - g24Landed, 2)}</span></div>
                <div class="breakdown-row"><span>+ GST</span> <span class="val">₹${formatINR(g24Final - g24Retail, 2)}</span></div>
                <div class="breakdown-row final-line"><span>Final / g</span> <span class="val">₹${formatINR(g24Final, 2)}</span></div>
            </div>
            
            <div class="breakdown-section-gold gold-22k">
                <h4>GOLD (22K)</h4>
                <div class="breakdown-row"><span>Base Rate (Market)</span> <span class="val">₹${formatINR(g22Base, 2)}</span></div>
                <div class="breakdown-row"><span>+ Import & Charges</span> <span class="val">₹${formatINR(g22Landed - g22Base, 2)}</span></div>
                <div class="breakdown-row"><span>+ Dealer Margin</span> <span class="val">₹${formatINR(g22Retail - g22Landed, 2)}</span></div>
                <div class="breakdown-row"><span>+ GST</span> <span class="val">₹${formatINR(g22Final - g22Retail, 2)}</span></div>
                <div class="breakdown-row final-line"><span>Final / g</span> <span class="val">₹${formatINR(g22Final, 2)}</span></div>
            </div>

            <div class="breakdown-section-silver">
                <h4>SILVER (99.9%)</h4>
                <div class="breakdown-row"><span>Base Rate (Market)</span> <span class="val">₹${formatINR(sBase, 2)}</span></div>
                <div class="breakdown-row"><span>+ Import & Charges</span> <span class="val">₹${formatINR(sLanded - sBase, 2)}</span></div>
                <div class="breakdown-row"><span>+ Dealer Margin</span> <span class="val">₹${formatINR(sRetail - sLanded, 2)}</span></div>
                <div class="breakdown-row"><span>+ GST</span> <span class="val">₹${formatINR(sFinal - sRetail, 2)}</span></div>
                <div class="breakdown-row final-line"><span>Final / kg</span> <span class="val">₹${formatINR(sFinal * 1000, 0)}</span></div>
            </div>
        `;
    };

    // --- Init ---
    const startApp = () => {
        fetchAllData(true); // Initial load fetches everything
        refreshTimer = setInterval(() => fetchAllData(false), REFRESH_INTERVAL); // Refresh only Market inputs

        // Listeners for manual changes
        const autoCalInputs = [
            goldSpotInput, silverSpotInput, usdInrInput,
            importDutyInput, gstInput, bankChargesInput, marginInput,
            localGold24kInput, localGold22kInput, localSilverInput
        ];

        autoCalInputs.forEach(input => {
            input.addEventListener('input', calculate);
        });

        silverUnitSelect.addEventListener('change', calculate);
        refreshBtn.addEventListener('click', () => {
            clearInterval(refreshTimer);
            fetchAllData(false); // Manually refresh only market rates
            refreshTimer = setInterval(() => fetchAllData(false), REFRESH_INTERVAL);
        });

        // Mobile Tabs Logic
        const tabBtns = document.querySelectorAll('.tab-btn');
        const columns = {
            'results-column': document.querySelector('.results-column'),
            'settings-column': document.querySelector('.settings-column'),
            'breakdown-column': document.querySelector('.breakdown-column')
        };

        const updateTabs = () => {
            if (window.innerWidth <= 768) {
                // Ensure only active tab is shown on mobile
                const activeBtn = document.querySelector('.tab-btn.active');
                if (activeBtn) {
                    const target = activeBtn.getAttribute('data-target');
                    Object.values(columns).forEach(col => col.classList.remove('column-active'));
                    if (columns[target]) columns[target].classList.add('column-active');
                }
            } else {
                // Remove active classes on desktop so default CSS grid takes over
                Object.values(columns).forEach(col => col.classList.remove('column-active'));
            }
        };

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                const clickedBtn = e.target;
                clickedBtn.classList.add('active');
                updateTabs();
            });
        });

        window.addEventListener('resize', updateTabs);
        updateTabs(); // Init on load
    };

    startApp();
});
