document.addEventListener('DOMContentLoaded', () => {
    // === Multi-step Form Logic ===
    const steps = document.querySelectorAll('.form-step');
    const nextBtns = document.querySelectorAll('.next-step');
    const prevBtns = document.querySelectorAll('.prev-step');
    const form = document.getElementById('auditForm');
    const progressFill = document.querySelector('.progress-fill');

    let currentStep = 0;

    function updateStep() {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        // Update Progress Bar
        const progress = ((currentStep + 1) / steps.length) * 100;
        progressFill.style.width = `${progress}%`;
    }

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                const currentStepEl = steps[currentStep];
                let valid = false;

                // Check for standard required inputs (selects, text inputs NOT in custom wrapper)
                const standardInputs = currentStepEl.querySelectorAll('select, input[type="text"], input[type="number"]:not(.custom-field)');
                let standardValid = true;
                standardInputs.forEach(input => {
                    if (input.hasAttribute('required') && !input.value) standardValid = false;
                });

                // Check for Radio/Custom logic
                // If the step has radio buttons, we need EITHER a radio checked OR the custom field filled
                const radios = currentStepEl.querySelectorAll('input[type="radio"]');
                const customInput = currentStepEl.querySelector('.custom-field');

                if (radios.length > 0) {
                    const radioChecked = [...radios].some(r => r.checked);
                    const customFilled = customInput && customInput.value.trim() !== '';

                    if (radioChecked || customFilled) {
                        valid = true;
                    }
                } else {
                    // Normal step without radios (Step 1-6 mostly use radios or valid selects)
                    // Just revert to standardValid for those steps if they don't have the hybrid logic
                    if (standardValid) valid = true;
                }

                if (valid) {
                    currentStep++;
                    updateStep();
                } else {
                    alert('Iltimos, variantlardan birini tanlang yoki o\'z qiymatingizni kiriting!');
                }
            }
        });
    });

    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateStep();
            }
        });
    });

    // === Audit Engine & Report Generation ===
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect Data
        const formData = new FormData(form);
        const rawData = Object.fromEntries(formData.entries());

        // Merge Custom vs Selected Data
        const data = {
            ...rawData,
            targetIncome: rawData.targetIncome_custom || rawData.targetIncome,
            avgCheck: rawData.avgCheck_custom || rawData.avgCheck,
            conversion: rawData.conversion_custom || rawData.conversion
        };

        if (!data.targetIncome || !data.avgCheck || !data.conversion) {
            alert('Iltimos, moliyaviy ma\'lumotlarni kiriting!');
            return;
        }

        generateReport(data);
    });

    function generateReport(data) {
        // 1. Analyze Risk
        let riskScore = 0; // 0 = Good, Higher = Bad
        const riskFactors = [];
        const goodPoints = [];
        let efficiencyLoss = 0;

        // CRM Check
        if (data.hasCRM === 'no') {
            riskScore += 2;
            efficiencyLoss += 20;
            riskFactors.push({ text: "CRM Tizimi mavjud emas", icon: "ri-close-circle-fill", color: "negative" });
        } else {
            goodPoints.push({ text: "CRM Tizimi mavjud", icon: "ri-checkbox-circle-fill", color: "positive" });
        }

        // Sales Team Check
        if (data.hasSalesTeam === 'no') {
            riskScore += 2;
            efficiencyLoss += 20;
            riskFactors.push({ text: "Alohida sotuv bo'limi yo'q", icon: "ri-user-unfollow-fill", color: "negative" });
        } else {
            goodPoints.push({ text: "Sotuv bo'limi shakllangan", icon: "ri-team-fill", color: "positive" });
        }

        // Social Media Check
        if (data.socialStatus === 'bad') {
            riskScore += 1;
            riskFactors.push({ text: "Ijtimoiy tarmoqlar holati qoniqarsiz", icon: "ri-instagram-fill", color: "negative" });
        } else if (data.socialStatus === 'good') {
            goodPoints.push({ text: "Ijtimoiy tarmoqlar yaxshi holatda", icon: "ri-instagram-fill", color: "positive" });
        }

        // 2. Financial Calculations
        const target = parseFloat(data.targetIncome);
        const check = parseFloat(data.avgCheck);
        const conversion = parseFloat(data.conversion);

        const customersNeeded = Math.ceil(target / check);
        const leadsNeeded = Math.ceil(customersNeeded / (conversion / 100));

        // Budget Est. (Using $1.5 as reliable benchmark for Insta/FB)
        const cpl = 1.5;
        const minBudget = Math.ceil(leadsNeeded * cpl);
        // Optimize budget if efficiency is low, show "Real Cost" vs "Optimal Cost"
        const wastedBudget = Math.ceil(minBudget * (efficiencyLoss / 100));
        const totalRealBudget = minBudget + wastedBudget;


        // 3. Generate HTML
        const reportHTML = `
            <div class="audit-grid">
                <!-- Risk Card -->
                <div class="audit-card glass ${riskScore >= 2 ? 'risk-high' : 'risk-low'}">
                    <div class="card-header">
                        <i class="ri-dashboard-3-line icon-risk" style="color: ${riskScore >= 2 ? 'var(--accent-red)' : 'var(--accent-green)'}"></i>
                        <h3>Biznes Holati</h3>
                    </div>
                    <p class="status-text">${riskScore >= 2 ? '🔴 Yuqori Xavf' : '🟢 Barqaror'}</p>
                    <ul class="audit-list">
                        ${riskFactors.map(f => `<li class="${f.color}"><i class="${f.icon}"></i> ${f.text}</li>`).join('')}
                        ${goodPoints.map(f => `<li class="${f.color}"><i class="${f.icon}"></i> ${f.text}</li>`).join('')}
                    </ul>
                </div>

                <!-- Financial Card -->
                <div class="audit-card glass">
                    <div class="card-header">
                        <i class="ri-coins-line icon-money"></i>
                        <h3>Moliyaviy Reja</h3>
                    </div>
                    <div class="calc-results-mini">
                        <div class="res-row">
                            <span>Maqsad:</span>
                            <strong>$${target.toLocaleString()}</strong>
                        </div>
                        <div class="res-row">
                            <span>Kerakli Mijozlar:</span>
                            <strong>${customersNeeded} ta</strong>
                        </div>
                        <div class="res-row">
                            <span>Kerakli Lidlar:</span>
                            <strong>${leadsNeeded} ta</strong>
                        </div>
                        <div class="res-divider"></div>
                        <div class="res-row highlight">
                            <span>Reklama Byudjeti:</span>
                            <strong>$${minBudget.toLocaleString()} - $${totalRealBudget.toLocaleString()}</strong>
                        </div>
                        ${efficiencyLoss > 0 ? `<p class="warning-text"><i class="ri-alert-line"></i> Tizim yo'qligi sababli $${wastedBudget} ortiqcha sarflashingiz mumkin!</p>` : ''}
                    </div>
                </div>
            </div>

            <!-- Recommendations -->
            <div class="recommendations glass mt-4">
                <h3>💡 Asosiy Tavsiyalar</h3>
                <div class="rec-grid">
                    ${data.hasCRM === 'no' ? `
                    <div class="rec-item">
                        <i class="ri-macbook-line"></i>
                        <div>
                            <h4>CRM Joriy qiling</h4>
                            <p>Mijozlar bazasini yo'qotmaslik uchun AmoCRM yoki Bitrix24 o'rnating.</p>
                        </div>
                    </div>` : ''}
                    
                    ${data.hasSalesTeam === 'no' ? `
                    <div class="rec-item">
                        <i class="ri-user-voice-line"></i>
                        <div>
                            <h4>Sotuv menejeri yollang</h4>
                            <p>Siz biznesni rivojlantirish bilan shug'ullaning, sotuvni profesionallarga topshiring.</p>
                        </div>
                    </div>` : ''}

                    <div class="rec-item">
                        <i class="ri-advertisement-line"></i>
                        <div>
                            <h4>Reklama Strategiyasi</h4>
                            <p>${data.platform} platformasida byudjetni kichik summadan boshlab (CPL test), lid narxi aniqlangach masshtab qiling.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 4. Render & Switch View
        const dynamicReport = document.getElementById('dynamicReport');
        const formContainer = document.getElementById('auditFormContainer');
        const resultsContainer = document.getElementById('resultsContainer');

        dynamicReport.innerHTML = reportHTML;

        // Animate Switch
        formContainer.style.opacity = '0';
        setTimeout(() => {
            formContainer.style.display = 'none';
            resultsContainer.style.display = 'block';
            resultsContainer.style.opacity = '0';

            // Trigger reflow
            resultsContainer.offsetHeight;

            resultsContainer.style.opacity = '1';
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }

    // Restart Logic
    document.getElementById('restartBtn').addEventListener('click', () => {
        const formContainer = document.getElementById('auditFormContainer');
        const resultsContainer = document.getElementById('resultsContainer');

        resultsContainer.style.opacity = '0';
        setTimeout(() => {
            resultsContainer.style.display = 'none';
            formContainer.style.display = 'block';

            // Reset form steps
            currentStep = 0;
            updateStep();

            formContainer.style.opacity = '0';
            formContainer.offsetHeight;
            formContainer.style.opacity = '1';
        }, 300);
    });

    // Smooth Scroll for Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
