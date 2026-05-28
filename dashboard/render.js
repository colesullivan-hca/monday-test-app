export function renderSteps(steps) {
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

export function renderDashboard(trips) {
    return Object.values(trips).map(trip => {
        // 1. Conditionally render the Request Link slot
        const requestLinkMarkup = trip.requestUrl 
            ? `<a href="${trip.requestUrl}" target="_blank" rel="noopener noreferrer" class="sidebar-link">
                   <span>Request</span>
                   <svg class="new-tab-icon" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
               </a>`
            : '<div></div>'; // Blank spacer holding the top position if missing

        // 2. Conditionally render the ISTE Link slot
        const isteLinkMarkup = trip.isteUrl 
            ? `<a href="${trip.isteUrl}" target="_blank" rel="noopener noreferrer" class="sidebar-link">
                   <span>ISTE</span>
                   <svg class="new-tab-icon" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
               </a>`
            : '<div></div>'; // Blank spacer holding the bottom position if missing

        // 3. Wrap everything inside the .card-wrapper structure
        return `
            <div class="card-wrapper">
                <div class="card-actions-sidebar">
                    ${requestLinkMarkup}
                    ${isteLinkMarkup}
                </div>

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
                                            ${trip.progressLabel || ''}
                                        </span>
                                        <span>${trip.progressLabel ? '' : `${trip.progress}% Complete`}</span>
                                    </div>
                                </div>

                                <div class="status-badge" style="background-color: ${trip.isDenied ? '#f8d7da' : trip.statusBg}; color: ${trip.isDenied ? '#721c24' : trip.statusColor}; ${trip.isDenied ? 'border: 1px solid #f5c6cb;' : ''}">
                                    ${trip.statusText}
                                </div>
                                <span class="toggle-arrow">▼</span>
                            </div>
                        </summary>
                        
                        <div class="details-panel">
                            <div class="phase-column">
                                <h4>1. Pre-Travel Pipeline</h4>
                                <div class="step-list">
                                    ${renderSteps(trip.preTravelSteps || [])}
                                </div>
                            </div>

                            <div class="phase-column">
                                <h4>2. Post-Travel Reimbursement</h4>
                                <div class="step-list">
                                    ${renderSteps(trip.postTravelSteps || [])}
                                </div>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        `;
    }).join('');
}