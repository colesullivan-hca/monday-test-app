function renderSteps(steps) {
    return steps.map( step => {
        let marker = '';
        if (step.state === "done") marker = '✓';
        else if (step.state === 'current') marker = '•';
        else if (step.state === 'denied') marker = '✕';

        const actorMarkup = step.actor ? `<span class="actor-tag">${step.actor}</span>` : '';

        return `
            <div class="step-item ${step.state}">
                <span class="step-marker">${marker}</span>
                <span>${step.text} ${actorMarkup}</span>
            </div>
        `;
    }).join('');
}

function renderDashboard(trips) {
    return trips.map(trip => {
        return `
            <div class="travel-card ${trip.isDenied ? 'is-denied' : ''}">
                <details>
                    <summary>
                        <div class="card-summary-row">
                            <div class="trip-identity">
                                <h2 class="trip-title">${trip.title}</h2>
                                <p class="trip-meta">${trip.location} • ${trip.dates}</p>
                            </div>
                            
                            <div class="progress-block">
                                <div class="bar-bg">
                                    <div class="bar-fill ${trip.isDenied ? 'denied' : ''}" style="width: ${trip.progress}%;"></div>
                                </div>
                                <div class="progress-labels">
                                    <span style="${trip.isDenied ? 'color: var(--danger); font-weight: 600;' : ''}">
                                        ${trip.progressLabel}
                                    </span>
                                    <span>${trip.progress}% Complete</span>
                                </div>
                            </div>

                            <div class="status-badge" style="background-color: ${trip.statusBg}; color: ${trip.statusColor}; ${trip.isDenied ? 'border: 1px solid #f5c6cb;' : ''}">
                                ${trip.statusText}
                            </div>
                            <span class="toggle-arrow">▼</span>
                        </div>
                    </summary>
                    
                    <div class="details-panel">
                        <div class="phase-column">
                            <h4>1. Pre-Travel Pipeline</h4>
                            <div class="step-list">
                                ${renderSteps(trip.preTravelSteps)}
                            </div>
                        </div>

                        <div class="phase-column">
                            <h4>2. Post-Travel Reimbursement</h4>
                            <div class="step-list">
                                ${renderSteps(trip.postTravelSteps)}
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        `;
    }).join('');
}