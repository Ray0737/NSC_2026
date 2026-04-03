import { supabase } from './authen/auth.js';

        let currentProfile = null;
        let selectedFile = null;
        let calendar = null;
        let countdownInterval = null;
        let messageSubscription = null;
        const profileCache = new Map();

        // Logout logic
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Logout error:', error.message);
                } else {
                    window.location.href = 'authen/login.html';
                }
            });
        }

        // Avatar preview
        const avatarInput = document.getElementById('avatarInput');
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    selectedFile = file;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        avatarPreview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Display user info
        async function loadUserInfo() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                const userType = document.getElementById('userType');
                const miniCallsign = document.getElementById('mini-callsign');
                const miniInfo = document.getElementById('mini-info');
                const miniAvatar = document.getElementById('mini-avatar');

                if (profile) {
                    currentProfile = profile;
                    userType.textContent = (profile.major || profile.nickname || 'OPERATIVE').toUpperCase();
                    miniCallsign.textContent = profile.callsign || 'OPERATIVE';
                    miniInfo.textContent = `${profile.grade || 'M.?'}${profile.major ? ' | ' + profile.major : ''}`;

                    if (profile.avatar_url) {
                        miniAvatar.innerHTML = `<img src="${profile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        avatarPreview.innerHTML = `<img src="${profile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    }

                    // Pre-fill modal
                    document.getElementById('edit-first-name').value = profile.first_name || '';
                    document.getElementById('edit-last-name').value = profile.last_name || '';
                    document.getElementById('edit-nickname').value = profile.nickname || '';
                    document.getElementById('edit-callsign').value = profile.callsign || '';
                    document.getElementById('edit-telephone').value = profile.telephone || '';
                    document.getElementById('edit-school').value = profile.school || '';
                    document.getElementById('edit-grade').value = profile.grade || '';
                    document.getElementById('edit-major').value = profile.major || '';
                    document.getElementById('edit-birthdate').value = profile.birthdate || '';

                    // Start Countdown & Interests
                    initAdmissionCountdown(profile.grade);
                    selectedInterests = profile.faculties || [];
                    renderInterestCatalog();
                    initFacultyChips();
                }
            }
        }

        // --- COUNTDOWN LOGIC ---
        function initAdmissionCountdown(grade) {
            if (countdownInterval) clearInterval(countdownInterval);
            const currentYear = new Date().getFullYear();
            let targetYear = currentYear;
            const gradeNum = parseInt(grade?.match(/\d+/)?.[0] || '6');
            const yearsRemaining = 6 - gradeNum;
            targetYear += yearsRemaining;
            if (yearsRemaining === 0 && new Date().getMonth() >= 6) targetYear += 1;
            const targetDate = new Date(`July 1, ${targetYear} 00:00:00`).getTime();
            document.getElementById('targetYearLabel').textContent = `TARGET: ESTIMATED JULY ${targetYear}`;
            function updateCountdown() {
                const now = new Date().getTime();
                const distance = targetDate - now;
                if (distance < 0) {
                    clearInterval(countdownInterval);
                    document.getElementById('admission-countdown').innerHTML = "<h3 class='text-success fw-bold'>ADMISSION PERIOD ACTIVE</h3>";
                    return;
                }
                const years = Math.floor(distance / (1000 * 60 * 60 * 24 * 365));
                const months = Math.floor((distance % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                document.getElementById('cd-years').innerText = String(years).padStart(2, '0');
                document.getElementById('cd-months').innerText = String(months).padStart(2, '0');
                document.getElementById('cd-days').innerText = String(days).padStart(2, '0');
                document.getElementById('cd-hours').innerText = String(hours).padStart(2, '0');
                document.getElementById('cd-mins').innerText = String(minutes).padStart(2, '0');
                document.getElementById('cd-secs').innerText = String(seconds).padStart(2, '0');
            }
            countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown();
        }

        // --- INTEREST CATALOG LOGIC ---
        const facultyData = [
            {
                uni: "Chulalongkorn University (CU)", faculties: [
                    { name: "ISE (Int. School of Engineering)", majors: ["AI / Robotics", "AERO", "ADME", "ICE", "NANO"] },
                    { name: "Faculty of Engineering", majors: ["CEDT", "Computer Eng", "Mechanical Eng", "Electrical Eng"] },
                    { name: "Faculty of Commerce & Accountancy", majors: ["BBA", "Marketing", "Finance"] },
                    { name: "Faculty of Medicine", majors: ["MDCU"] },
                    { name: "Faculty of Dentistry", majors: ["Dentistry"] },
                    { name: "Faculty of Science", majors: ["Comp Sci", "BioTech"] }
                ]
            },
            {
                uni: "Thammasat University (TU)", faculties: [
                    { name: "TEP/TEPE (Engineering)", majors: ["Civil Eng", "Auto Eng", "Cyber Sec"] },
                    { name: "TDB (Business)", majors: ["BBA TU", "Accounting"] },
                    { name: "Faculty of Law", majors: ["Law"] }
                ]
            },
            {
                uni: "Mahidol University", faculties: [
                    { name: "Faculty of Medicine (Siriraj)", majors: ["Medicine"] },
                    { name: "International College (MUIC)", majors: ["Computer Science", "Finance", "Comm Design"] }
                ]
            },
            {
                uni: "Kasetsart University (KU)", faculties: [
                    { name: "Faculty of Engineering", majors: ["Aero Eng", "Mechanical Eng", "Soft En"] }
                ]
            },
            {
                uni: "Stanford University", faculties: [
                    { name: "School of Engineering", majors: ["CS", "AI", "HCI"] },
                    { name: "GSB (Business)", majors: ["MBA"] }
                ]
            },
            {
                uni: "MIT", faculties: [
                    { name: "School of Engineering", majors: ["EECS", "MechE"] }
                ]
            }
        ];

        let selectedInterests = [];

        function renderInterestCatalog() {
            const catalog = document.getElementById('facultyCatalog');
            if (!catalog) return;
            catalog.innerHTML = selectedInterests.map((item, idx) => `
                <div class="interest-chip px-3 py-1 border border-dark rounded-pill d-flex align-items-center gap-2 bg-white shadow-sm" style="font-size: 0.55rem;">
                    <span class="fw-bold">${item}</span>
                    <i class="bi bi-x-circle-fill text-danger" style="cursor:pointer; font-size: 0.65rem;" onclick="removeInterest(${idx})"></i>
                </div>
            `).join('');
            saveInterests();
        }

        async function saveInterests() {
            if (!currentProfile || !selectedInterests) return;
            const { error } = await supabase.from('profiles').update({ faculties: selectedInterests }).eq('id', currentProfile.id);
            if (error) console.error('Sync Error:', error.message);
        }

        window.removeInterest = (idx) => {
            selectedInterests.splice(idx, 1);
            renderInterestCatalog();
        };

        window.addInterest = (val) => {
            if (!selectedInterests.includes(val)) {
                selectedInterests.push(val);
                renderInterestCatalog();
            }
            const searchInput = document.getElementById('facultySearchInput');
            const suggestionsBox = document.getElementById('facultySuggestions');
            if (searchInput) searchInput.value = '';
            if (suggestionsBox) suggestionsBox.style.display = 'none';
        };

        function initFacultyChips() {
            const searchInput = document.getElementById('facultySearchInput');
            const suggestionsBox = document.getElementById('facultySuggestions');
            if (!searchInput) return;

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (!query || query.length < 1) {
                    suggestionsBox.style.display = 'none';
                    return;
                }

                let matches = [];
                facultyData.forEach(u => {
                    const uniShort = u.uni.split('(')[1]?.replace(')', '') || u.uni;
                    u.faculties.forEach(f => {
                        const facName = f.name;
                        // Match Uni or Faculty
                        if (u.uni.toLowerCase().includes(query) || facName.toLowerCase().includes(query)) {
                            matches.push(`${uniShort} > ${facName}`);
                        }
                        // Match Majors
                        f.majors.forEach(m => {
                            if (m.toLowerCase().includes(query)) {
                                matches.push(`${uniShort} > ${facName} > ${m}`);
                            }
                        });
                    });
                });

                const uniqueMatches = [...new Set(matches)].slice(0, 10);
                if (uniqueMatches.length > 0) {
                    suggestionsBox.innerHTML = uniqueMatches.map(m => `
                        <div class="dropdown-item py-2 border-bottom x-small tracking-wider fw-bold" style="cursor:pointer; font-size: 0.6rem;" onclick="addInterest('${m}')">
                            ${m}
                        </div>
                    `).join('');
                    suggestionsBox.style.display = 'block';
                } else {
                    suggestionsBox.style.display = 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (searchInput && !searchInput.contains(e.target) && suggestionsBox && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.style.display = 'none';
                }
            });
        }

        // --- RECRUITMENT / WORK GRID MODULE ---
        let newsInitialized = false;
        async function initNewsModule() {
            const container = document.getElementById('newsContainer');
            const { data: news, error } = await supabase.from('intelligence_hub').select('*').order('created_at', { ascending: false });

            if (error || !news || news.length === 0) {
                container.innerHTML = `<div class="col-12 p-5 text-center text-muted x-small fw-bold">NO ACTIVE RECRUITMENT ADS AVAILABLE.</div>`;
                return;
            }

            const { data: allBookings } = await supabase.from('intelligence_booking').select('*');
            const { data: allGroups } = await supabase.from('groups').select('linked_hub_id, title');
            const { data: allProfiles } = await supabase.from('profiles').select('id, callsign, avatar_url');
            const profileMap = {};
            (allProfiles || []).forEach(p => { profileMap[p.id] = p; });

            container.innerHTML = news.map(c => {
                const hubsBookings = (allBookings || []).filter(b => b.hub_id === c.id);
                const statusColor = c.status === 'ACTIVE' ? 'success' : (c.status === 'FULL' ? 'warning' : (c.status === 'COMPLETED' ? 'secondary' : 'dark'));
                const linkedGroup = (allGroups || []).find(g => g.linked_hub_id === c.id);

                // Resolve all unique member IDs across all bookings for this hub
                const allMemberIds = [...new Set(hubsBookings.flatMap(b => b.member_ids || []))];
                const members = allMemberIds.map(mid => profileMap[mid]).filter(Boolean);

                // Creator info
                const creator = profileMap[c.created_by];
                const creatorName = creator ? (creator.callsign || 'OPERATIVE') : 'UNKNOWN';

                return `
                <div class="col" id="news-card-${c.id}">
                    <div class="tactical-card h-100 d-flex flex-column bg-white shadow-sm" style="border: 1px solid #ddd; transition: all 0.3s ease;">
                        <div class="p-4 flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <span class="badge bg-${statusColor} rounded-0 px-2 py-1" style="font-size: 0.45rem; letter-spacing: 1px;">${c.status || 'OPEN'}</span>
                                <span class="x-small text-muted fw-bold" style="font-size: 0.5rem;">REF_${c.id.substring(0, 4)}</span>
                            </div>
                            <h5 class="fw-black mb-1 text-uppercase" style="letter-spacing: 0.5px; font-size: 0.9rem; line-height: 1.2;">${c.title}</h5>
                            <p class="mb-2 x-small text-muted" style="font-size: 0.5rem;">POSTED BY <span class="fw-bold">${creatorName.toUpperCase()}</span></p>
                            <div class="d-flex flex-wrap gap-1 mb-3">
                                ${(c.tags || []).map(t => `<span class="badge bg-light border text-muted px-2" style="font-size:0.45rem; font-weight: 800;">${t.trim().toUpperCase()}</span>`).join('')}
                            </div>
                            <p class="mb-3 text-muted" style="font-size: 0.7rem; line-height: 1.5; min-height: 2rem;">${c.description || 'NO ADDITIONAL DETAILS PROVIDED.'}</p>
                        </div>
                        
                        <!-- TEAM MEMBERS SECTION -->
                        <div class="border-top px-4 py-3" style="background: #fafafa;">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="x-small text-muted fw-bold text-uppercase" style="font-size:0.45rem; letter-spacing: 1px;">${hubsBookings.length > 0 ? hubsBookings[0].team_name.toUpperCase() : 'TEAM_ROSTER'}</span>
                                <span class="badge bg-dark rounded-pill px-2" style="font-size: 0.45rem;">${members.length} MEMBER${members.length !== 1 ? 'S' : ''}</span>
                            </div>
                            ${members.length > 0 ? `
                                <div class="d-flex flex-wrap gap-1 mb-1">
                                    ${members.slice(0, 8).map(m => `
                                        <div class="d-flex align-items-center gap-1 bg-white border rounded-pill px-2 py-1 cursor-pointer" onclick="viewUserProfile('${m.id}')" title="${(m.callsign || 'OPERATIVE').toUpperCase()}" style="transition: all 0.2s;">
                                            <div class="rounded-circle bg-dark d-flex align-items-center justify-content-center overflow-hidden" style="width: 16px; height: 16px; min-width: 16px;">
                                                ${m.avatar_url ? `<img src="${m.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="bi bi-person text-white" style="font-size: 0.5rem;"></i>`}
                                            </div>
                                            <span class="fw-bold text-uppercase" style="font-size: 0.45rem; letter-spacing: 0.5px;">${(m.callsign || 'OPR').toUpperCase()}</span>
                                        </div>
                                    `).join('')}
                                    ${members.length > 8 ? `<span class="badge bg-light text-muted border rounded-pill px-2 py-1" style="font-size: 0.45rem;">+${members.length - 8} MORE</span>` : ''}
                                </div>
                            ` : `
                                <p class="m-0 x-small text-muted fst-italic" style="font-size: 0.5rem;">No members yet — be the first to join.</p>
                            `}
                        </div>

                        <div class="mt-auto border-top p-3 bg-light-subtle">
                            <div class="d-flex gap-1">
                                ${c.created_by !== currentProfile?.id ? `
                                    <button class="btn btn-black btn-xs flex-grow-1 rounded-0 py-2 fw-bold" onclick="showBookingForm('${c.id}', '${c.title.replace(/'/g, "\\'")}')" style="font-size: 0.5rem;">REQUEST_JOIN</button>
                                ` : `
                                    <button class="btn btn-black btn-xs flex-grow-1 rounded-0 py-2 fw-bold" onclick="manageHubRoster('${c.id}', '${c.title.replace(/'/g, "\\'")}')" style="font-size: 0.5rem;">EDIT_ROSTER</button>
                                `}
                                
                                ${linkedGroup ? `
                                    <button class="btn btn-outline-dark btn-xs px-2 rounded-0 flex-grow-1 fw-bold" onclick="openLinkedChat('${c.id}', '${linkedGroup.title.replace(/'/g, "\\'")}')" title="GOTO CHAT" style="font-size: 0.5rem;">
                                        OPEN_CHAT
                                    </button>
                                ` : (c.created_by === currentProfile?.id && (c.status === 'FULL' || c.status === 'ACTIVE') ? `
                                    <button class="btn btn-outline-dark btn-xs px-2 rounded-0 flex-grow-1 fw-bold" onclick="createChatFromHub('${c.id}', '${c.title.replace(/'/g, "\\'")}')" title="CREATE CHAT" style="font-size: 0.5rem; white-space: nowrap;">
                                        + CHAT
                                    </button>
                                ` : '')}

                                ${c.created_by === currentProfile?.id ? `
                                    <button class="btn btn-outline-dark btn-xs px-2 rounded-0" onclick="editNews('${encodeURIComponent(JSON.stringify(c)).replace(/'/g, "\\'")}')" title="EDIT">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-xs px-2 rounded-0" onclick="deleteNews('${c.id}')" title="PURGE">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }

        window.createChatFromHub = async (hubId, hubTitle) => {
            const { data: bookings } = await supabase.from('intelligence_booking').select('member_ids').eq('hub_id', hubId);
            let memberIds = [...new Set((bookings || []).flatMap(b => b.member_ids || []))];
            if (!memberIds.includes(currentProfile.id)) memberIds.push(currentProfile.id);

            const { error } = await supabase.from('groups').insert([{
                title: hubTitle,
                project_name: 'Recruitment Team',
                linked_hub_id: hubId,
                members: memberIds,
                created_by: currentProfile.id
            }]);

            if (!error) {
                tacticalNotify('TEAM CHAT INITIATED');
                initNewsModule();
                if (chatInitialized) loadGroups();
            } else {
                tacticalNotify('ERROR: ' + error.message);
                console.error(error);
            }
        };

        window.manageHubRoster = async (hubId, title) => {
            document.getElementById('enlist-mode').value = 'manage';
            document.getElementById('enlist-hub-id').value = hubId;
            document.getElementById('enlistTeamNameWrap').classList.remove('d-none');
            
            // Get existing team name if possible
            const { data: existing } = await supabase.from('intelligence_booking').select('team_name').eq('hub_id', hubId).limit(1).single();
            document.getElementById('enlist-team-name').value = existing ? existing.team_name : 'Primary Roster';
            
            document.getElementById('enlistModalTitle').innerText = `ROSTER_MGMT // ${title.toUpperCase()}`;

            const memberListDiv = document.getElementById('enlist-member-list');
            memberListDiv.innerHTML = '<div class="text-center p-3 text-muted x-small">QUERYING_PERSONNEL...</div>';
            new bootstrap.Modal(document.getElementById('enlistModal')).show();

            const { data: bookings } = await supabase.from('intelligence_booking').select('member_ids').eq('hub_id', hubId);
            const allMemberIds = [...new Set((bookings || []).flatMap(b => b.member_ids || []))];

            const { data: profiles } = await supabase.from('profiles').select('id, callsign');
            if (profiles) {
                memberListDiv.innerHTML = profiles.map(p => `
                    <div class="form-check p-2 border-bottom border-secondary-subtle hover-bg-light transition">
                        <input class="form-check-input ms-0 me-3" type="checkbox" value="${p.id}" id="chk-${p.id}" name="enlistMembers" ${allMemberIds.includes(p.id) ? 'checked' : ''}>
                        <label class="form-check-label x-small fw-bold text-uppercase" for="chk-${p.id}" style="cursor:pointer; font-size: 0.7rem;">
                            ${p.callsign || 'OPERATIVE_' + p.id.substring(0, 4)}
                        </label>
                    </div>
                `).join('');
            }
        };


        window.showBookingForm = async (hubId, title) => {
            document.getElementById('enlist-mode').value = 'request';
            document.getElementById('enlistTeamNameWrap').classList.remove('d-none');
            document.getElementById('enlist-hub-id').value = hubId;
            document.getElementById('enlist-team-name').value = '';
            document.getElementById('enlistModalTitle').innerText = `UNIT_ENLISTMENT // ${title.toUpperCase()}`;

            const memberListDiv = document.getElementById('enlist-member-list');
            memberListDiv.innerHTML = '<div class="text-center p-3 text-muted x-small">QUERYING_PERSONNEL...</div>';

            new bootstrap.Modal(document.getElementById('enlistModal')).show();

            // Fetch occupied members for this hub
            const { data: bookings } = await supabase.from('intelligence_booking').select('member_ids').eq('hub_id', hubId);
            const occupiedIds = (bookings || []).flatMap(b => b.member_ids || []);

            // Fetch all profiles
            const { data: profiles } = await supabase.from('profiles').select('id, callsign');

            if (profiles) {
                const available = profiles.filter(p => !occupiedIds.includes(p.id));
                if (available.length === 0) {
                    memberListDiv.innerHTML = '<div class="p-3 text-center text-danger x-small fw-bold">ALL_PERSONNEL_OCCUPIED_FOR_THIS_OPERATION</div>';
                } else {
                    memberListDiv.innerHTML = available.map(p => `
                        <div class="form-check p-2 border-bottom border-secondary-subtle hover-bg-light transition">
                            <input class="form-check-input ms-0 me-3" type="checkbox" value="${p.id}" id="chk-${p.id}" name="enlistMembers">
                            <label class="form-check-label x-small fw-bold text-uppercase" for="chk-${p.id}" style="cursor:pointer; font-size: 0.7rem;">
                                ${p.callsign || 'OPERATIVE_' + p.id.substring(0, 4)}
                            </label>
                        </div>
                    `).join('');
                }
            } else {
                memberListDiv.innerHTML = '<div class="text-center p-3 text-danger x-small">PERSONNEL_DATA_RETRIEVAL_ERROR</div>';
            }
        };

        const enlistForm = document.getElementById('enlistForm');
        if (enlistForm) {
            enlistForm.onsubmit = async (e) => {
                e.preventDefault();
                const mode = document.getElementById('enlist-mode').value;
                const hubId = document.getElementById('enlist-hub-id').value;
                const teamName = document.getElementById('enlist-team-name').value;
                const checkboxes = document.querySelectorAll('input[name="enlistMembers"]:checked');
                const memberIds = Array.from(checkboxes).map(c => c.value);

                if (mode === 'request') {
                    if (memberIds.length === 0) {
                        tacticalNotify('ERROR: NO PERSONNEL SELECTED');
                        return;
                    }
                    const { error } = await supabase.from('intelligence_booking').insert([{
                        hub_id: hubId,
                        team_name: teamName,
                        member_ids: memberIds,
                        slot_code: 'UNIT_' + (Math.random().toString(36).substring(2, 5).toUpperCase())
                    }]);
                    if (!error) {
                        bootstrap.Modal.getInstance(document.getElementById('enlistModal')).hide();
                        initNewsModule();
                        tacticalNotify('UNIT DEPLOYMENT SUCCESSFUL');
                    } else {
                        alert('DEPLOYMENT FAILED: ' + error.message);
                    }
                } else {
                    // Manage mode
                    await supabase.from('intelligence_booking').delete().eq('hub_id', hubId);
                    if (memberIds.length > 0) {
                        await supabase.from('intelligence_booking').insert([{
                            hub_id: hubId,
                            team_name: teamName || 'Main Roster',
                            member_ids: memberIds,
                            slot_code: 'UNIT_MAIN'
                        }]);
                    }
                    bootstrap.Modal.getInstance(document.getElementById('enlistModal')).hide();
                    initNewsModule();
                    tacticalNotify('ROSTER UPDATED');
                }
            };
        }

        window.openLinkedChat = async (hubId, teamName) => {
            const { data, error } = await supabase.from('groups').select('*').eq('linked_hub_id', hubId).eq('title', teamName).single();
            if (data) {
                if (document.getElementById('feature-chat').classList.contains('d-none')) {
                    toggleFeature('chat');
                }
                setTimeout(() => {
                    if (window.selectGroup) window.selectGroup(data.id, data.title, data.project_name);
                }, 400); // Wait for module transition
                tacticalNotify(`CONNECTING TO UNIT: ${teamName}`);
            } else {
                tacticalNotify('UNIT COMMS NOT INITIALIZED');
            }
        };

        // Post Intel Form logic
        document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
            // Already handled above, just making sure I don't break others...
        });

        const addNewsForm = document.getElementById('addNewsForm');
        if (addNewsForm) {
            addNewsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newsId = document.getElementById('news-id').value;
                const title = document.getElementById('news-title').value;
                const status = document.getElementById('news-status').value;
                const tagsStr = document.getElementById('news-tags').value;
                const description = document.getElementById('news-desc').value;
                const tags = tagsStr.split(',').map(t => t.trim());

                const newsData = { title, status, tags, description };
                let req;
                if (newsId) {
                    req = supabase.from('intelligence_hub').update(newsData).eq('id', newsId);
                } else {
                    newsData.created_by = currentProfile?.id;
                    req = supabase.from('intelligence_hub').insert([newsData]);
                }

                const { error } = await req;
                if (!error) {
                    bootstrap.Modal.getInstance(document.getElementById('addNewsModal')).hide();
                    addNewsForm.reset();
                    document.getElementById('news-id').value = '';
                    document.getElementById('addNewsModalTitle').innerText = 'RECRUITMENT_POST_SYSTEM';
                    document.getElementById('addNewsSubmitBtn').innerText = 'POST_ANNOUNCEMENT';
                    initNewsModule();
                    tacticalNotify(newsId ? 'POST UPDATED' : 'ANNOUNCEMENT POSTED');
                } else {
                    alert('UPLOAD ERROR: ' + error.message);
                }
            });
        }

        window.editNews = (newsJson) => {
            const news = JSON.parse(decodeURIComponent(newsJson));
            document.getElementById('news-id').value = news.id;
            document.getElementById('news-title').value = news.title;
            document.getElementById('news-status').value = news.status;
            document.getElementById('news-tags').value = (news.tags || []).join(', ');
            document.getElementById('news-desc').value = news.description;

            document.getElementById('addNewsModalTitle').innerText = 'EDIT_RECRUITMENT_POST';
            document.getElementById('addNewsSubmitBtn').innerText = 'COMMIT_CHANGES';
            new bootstrap.Modal(document.getElementById('addNewsModal')).show();
        };

        window.deleteNews = (id) => {
            console.log('PURGING_ID:', id);
            minimalConfirm('PURGE THIS ANNOUNCEMENT PERMANENTLY?', async () => {
                try {
                    // 1. Clear unit deployments first
                    const { error: bkErr } = await supabase.from('intelligence_booking').delete().eq('hub_id', id);
                    if (bkErr) console.warn('Booking purge warning:', bkErr.message);

                    // 2. Unlink any groups
                    const { error: gErr } = await supabase.from('groups').update({ linked_hub_id: null }).eq('linked_hub_id', id);
                    if (gErr) console.warn('Group unlink warning:', gErr.message);

                    // 3. Final record deletion
                    const { error, count } = await supabase.from('intelligence_hub').delete({ count: 'exact' }).eq('id', id);

                    if (error) {
                        console.error('Delete error:', error);
                        throw error;
                    }

                    if (count === 0) {
                        // Check if row actually exists
                        const { data: verify } = await supabase.from('intelligence_hub').select('id').eq('id', id).single();
                        if (!verify) throw new Error(`NOT_FOUND: ROW_${id.substring(0, 8)} MISSING`);
                        else throw new Error('RLS_DENIED: PLEASE ENABLE DELETE FOR OWNER IN SUPABASE POLICIES');
                    }

                    initNewsModule();
                    tacticalNotify('POST REMOVED');
                } catch (err) {
                    console.error('Purge transaction failed:', err);
                    tacticalNotify(`PURGE_ABORTED: ${err.message}`);
                }
            }, true);
        };

        // --- VISIBILITY TOGGLE LOGIC ---
        let chatInitialized = false;
        let calendarInitialized = false;

        function toggleFeature(type) {
            const feature = document.getElementById(`feature-${type}`);
            if (!feature) return;
            const headBtn = document.getElementById(`${type}Btn`);
            const types = ['home', 'chat', 'calendar', 'news', 'class'];

            const isOpening = feature.classList.contains('d-none');

            // 1. Close all features first to make it act like a navigation system (exclusive)
            types.forEach(t => {
                const f = document.getElementById(`feature-${t}`);
                const b = document.getElementById(`${t}Btn`);
                if (f) f.classList.add('d-none');
                if (b) b.classList.remove('active');
            });

            if (isOpening || type === 'home') {
                // 2. Open the requested feature
                feature.classList.remove('d-none');
                if (headBtn) headBtn.classList.add('active');

                // Lazy Initialization
                if (type === 'chat' && !chatInitialized) {
                    loadGroups();
                    loadUserSelection();
                    chatInitialized = true;
                } else if (type === 'calendar') {
                    if (!calendarInitialized) {
                        initCalendarModule();
                        calendarInitialized = true;
                    }
                    // Crucial: ensure FullCalendar updates size when shown
                    setTimeout(() => { if (calendar) { calendar.updateSize(); calendar.render(); } }, 100);
                } else if (type === 'news' && !newsInitialized) {
                    initNewsModule();
                    newsInitialized = true;
                }

                // 3. Scroll to the top if opening home, or scroll to the feature
                if (type === 'home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    const nav = document.querySelector('nav');
                    const navHeight = nav ? nav.offsetHeight + 40 : 100;
                    const elementPosition = feature.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({
                        top: elementPosition - navHeight,
                        behavior: 'smooth'
                    });
                }
            } else {
                // If closing a non-home feature, show home by default
                toggleFeature('home');
            }
        }

        // Helper to force-show a feature
        function showFeature(type) {
            const feature = document.getElementById(`feature-${type}`);
            if (feature.classList.contains('d-none')) toggleFeature(type);
        }

        function initCalendarModule() {
            document.getElementById('viewGridBtn').onclick = () => {
                document.getElementById('viewGridBtn').classList.add('active');
                document.getElementById('viewListBtn').classList.remove('active');
                document.getElementById('calendar').classList.remove('d-none');
                document.getElementById('eventCardsContainer').classList.add('d-none');
                calendar.changeView('dayGridMonth');
            };
            document.getElementById('viewListBtn').onclick = () => {
                document.getElementById('viewListBtn').classList.add('active');
                document.getElementById('viewGridBtn').classList.remove('active');
                document.getElementById('calendar').classList.add('d-none');
                document.getElementById('eventCardsContainer').classList.remove('d-none');
                renderEventCards();
            };

            calendar = null;
            loadEventUserSelection();
            initCalendar();
        }

        async function renderEventCards() {
            const container = document.getElementById('eventCardsContainer');
            const { data: events, error } = await supabase.from('calendar_events').select('*').order('start', { ascending: true });

            if (error || !events || events.length === 0) {
                container.innerHTML = `<div class="col-12 p-5 text-center text-muted x-small fw-bold">NO MISSION DATA LOGGED.</div>`;
                return;
            }

            const uid = currentProfile?.id;
            const filtered = events.filter(e =>
                e.scope === 'global' ||
                e.created_by === uid ||
                (e.shared_with && e.shared_with.includes(uid))
            );

            container.innerHTML = filtered.map(e => {
                const date = new Date(e.start);
                const day = date.getDate();
                const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
                const isTask = e.is_task;

                return `
                <div class="col">
                    <div class="tactical-card h-100 d-flex mb-0 ${isTask ? 'border-warning shadow-sm' : 'border-dark'}" style="border: 1px solid; transition: all 0.3s ease; background: #fff;">
                        <div class="p-3 d-flex flex-column w-100">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div class="text-center bg-black text-white px-2 py-1" style="min-width: 40px;">
                                    <p class="m-0 fw-black" style="font-size: 0.9rem; line-height: 1;">${day}</p>
                                    <p class="m-0 x-small fw-bold" style="font-size: 0.45rem;">${month}</p>
                                </div>
                                <span class="badge ${e.scope === 'global' ? 'bg-danger' : 'bg-dark'} rounded-0 px-2" style="font-size: 0.45rem; letter-spacing: 1px;">${e.scope.toUpperCase()}</span>
                            </div>
                            <h6 class="fw-bold text-uppercase mb-2 flex-grow-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">${e.title}</h6>
                            <p class="text-muted mb-3 text-truncate-2" style="font-size: 0.65rem;">${e.description || 'NO ADDITIONAL NOTES.'}</p>
                            <div class="mt-auto d-flex justify-content-between align-items-center pt-2 border-top">
                                <span class="x-small fw-bold text-muted" style="font-size: 0.5rem;">${new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <button class="btn btn-outline-dark btn-xs rounded-0 border-0 p-0" onclick="viewEventById('${e.id}')">
                                    <i class="bi bi-eye-fill"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        window.viewEventById = async (id) => {
            const { data: e } = await supabase.from('calendar_events').select('*').eq('id', id).single();
            if (e) {
                // Simulate FullCalendar event click object structure
                const mockEvent = {
                    id: e.id,
                    title: e.title,
                    start: e.start,
                    end: e.end,
                    allDay: !e.start.includes('T'),
                    extendedProps: {
                        scope: e.scope,
                        description: e.description,
                        is_task: e.is_task,
                        created_by: e.created_by,
                        shared_with: e.shared_with
                    }
                };
                // Find existing calendar trigger or just open modal manually 
                // Using the logic from eventClick (refactored would be better but let's be quick)
                showEventModal(mockEvent);
            }
        };

        // Helper for showing event modal from any source
        function showEventModal(evt) {
            const props = evt.extendedProps;
            document.getElementById('viewEventTitle').innerText = evt.title.toUpperCase();
            document.getElementById('viewEventID').innerText = `TAG: ${evt.id.substring(0, 8).toUpperCase()}`;
            document.getElementById('viewEventScope').innerText = props.scope || 'PERSONAL';
            document.getElementById('viewEventDescription').innerText = props.description || 'NO ADDITIONAL NOTES';
            const startStr = evt.start ? new Date(evt.start).toLocaleString() : '--';
            document.getElementById('viewEventTime').innerText = evt.allDay ? `${evt.startStr || new Date(evt.start).toDateString()}` : `${startStr}`;
            const taskArea = document.getElementById('viewEventTaskStatus');
            taskArea.innerHTML = props.is_task ? '<span class="badge bg-warning text-dark rounded-0 px-2 py-1" style="font-size:0.5rem">HIGH PRIORITY TASK</span>' : '';

            const adminActions = document.getElementById('eventAdminActions');
            if (props.created_by === currentProfile?.id) {
                adminActions.classList.remove('d-none');
                // Setup edit/delete handlers... (existing logic in initCalendar needs to be shared)
            } else { adminActions.classList.add('d-none'); }

            new bootstrap.Modal(document.getElementById('viewEventModal')).show();
        }

        // --- CHAT LOGIC ---
        let activeGroupId = null;
        async function loadGroups() {
            // Populate Hubs for linking
            const { data: hubs } = await supabase.from('intelligence_hub').select('id, title');
            const hubSelect = document.getElementById('groupLinkedHubId');
            if (hubSelect && hubs) {
                hubSelect.innerHTML = '<option value="">-- LINK TO COMPETITION (OPTIONAL) --</option>' +
                    hubs.map(h => `<option value="${h.id}">${h.title.toUpperCase()}</option>`).join('');
            }

            const sidebar = document.getElementById('groupsSidebarList');
            const { data: groups, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
            if (error || !groups || groups.length === 0) {
                sidebar.innerHTML = '<div class="text-center p-5 text-muted small">NO ACTIVE PROJECTS</div>';
                return;
            }
            sidebar.innerHTML = groups.map(g => `
                <div class="group-item p-3 ${activeGroupId === g.id ? 'active' : ''}" data-group-id="${g.id}" onclick="selectGroup('${g.id}', '${g.title.replace(/'/g, "\\'")}', '${(g.project_name || 'Generic Project').replace(/'/g, "\\'")}')">
                    <p class="m-0 fw-bold small text-uppercase">${g.title}</p>
                    <p class="m-0 text-muted x-small" style="font-size: 0.65rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${g.project_name || 'N/A'}</p>
                </div>
            `).join('');

            // Subscriptions are handled by initRealtimeSync
        }

        window.selectGroup = async (id, title, projectName) => {
            activeGroupId = id;
            const { data: group } = await supabase.from('groups').select('created_by').eq('id', id).single();
            if (!group) {
                tacticalNotify('ERROR: GROUP HAS BEEN PURGED');
                return;
            }
            const isCreator = group.created_by === currentProfile?.id;

            const meta = document.getElementById('groupMeta');
            if (meta) {
                meta.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center w-100 px-3">
                        <div class="text-start">
                            <p class="m-0 fw-bold text-uppercase" style="font-size: 0.65rem;">${title}</p>
                            <p class="m-0 text-muted x-small" style="font-size: 0.5rem; letter-spacing: 1px;">PROJECT: ${projectName}</p>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <div id="chatSyncStatus" class="rounded-circle bg-warning" style="width: 6px; height: 6px;"></div>
                            <span id="chatSyncText" class="x-small fw-bold text-warning" style="font-size: 0.45rem; letter-spacing: 1px;">SYNC: CONNECTING...</span>
                        </div>
                    </div>
                `;
            }
            const inputArea = document.getElementById('chatInputArea');
            if (inputArea) inputArea.classList.remove('d-none');

            const actions = document.getElementById('groupActions');
            if (actions) {
                actions.classList.remove('d-none');
                document.getElementById('clearChatBtn').classList.toggle('d-none', !isCreator);
                document.getElementById('deleteGroupBtn').classList.toggle('d-none', !isCreator);
                document.getElementById('leaveGroupBtn').classList.toggle('d-none', isCreator);

                document.querySelectorAll('#groupActions button').forEach(btn => btn.style.fontSize = '0.55rem');

                document.getElementById('clearChatBtn').onclick = () => purgeHistory(id);
                document.getElementById('deleteGroupBtn').onclick = () => terminateProject(id);
                document.getElementById('membersBtn').onclick = () => viewMembers(id);
                document.getElementById('leaveGroupBtn').onclick = () => leaveGroup(id);
            }

            document.querySelectorAll('.group-item').forEach(el => el.classList.remove('active'));
            const activeEl = document.querySelector(`.group-item[data-group-id="${id}"]`);
            if (activeEl) activeEl.classList.add('active');

            loadMessages(id);
        };
        let selectedChatFile = null;
        async function loadMessages(groupId) {
            const feed = document.getElementById('chatMessageFeed');
            const { data: messages, error } = await supabase
                .from('messages')
                .select(`*, profiles:sender_id(callsign)`)
                .eq('group_id', groupId)
                .order('created_at', { ascending: true });

            if (error) { feed.innerHTML = `<div class="p-4 text-danger small text-center">ERROR: ${error.message}</div>`; return; }

            // Render existing messages
            feed.innerHTML = messages.length > 0 ? messages.map(m => renderMessageHtml(m)).join('') : '<div class="py-5 text-muted text-center small">QUIET FREQUENCY. START COMMS...</div>';
            feed.scrollTop = feed.scrollHeight;

            // Handle Real-time Messages
            if (messageSubscription) supabase.removeChannel(messageSubscription);

            messageSubscription = supabase.channel(`public:messages:group_id=eq.${groupId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `group_id=eq.${groupId}`
                }, async (payload) => {
                    const newMsg = payload.new;
                    // Fetch profile for name if missing in cache
                    if (!profileCache.has(newMsg.sender_id)) {
                        const { data: p } = await supabase.from('profiles').select('callsign').eq('id', newMsg.sender_id).single();
                        if (p) profileCache.set(newMsg.sender_id, p.callsign);
                    }
                    newMsg.profiles = { callsign: profileCache.get(newMsg.sender_id) };

                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = renderMessageHtml(newMsg);
                    const emptyState = feed.querySelector('.py-5.text-muted');
                    if (emptyState) emptyState.remove();
                    feed.appendChild(tempDiv.firstElementChild);
                    feed.scrollTop = feed.scrollHeight;

                    if (newMsg.sender_id !== currentProfile.id) {
                        tacticalNotify(`INCOMING: ${newMsg.profiles.callsign.toUpperCase()}`);
                    }
                })
                .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages',
                    filter: `group_id=eq.${groupId}`
                }, () => {
                    loadExistingMessages(groupId);
                })
                .subscribe((status) => {
                    const statusDot = document.getElementById('chatSyncStatus');
                    const statusText = document.getElementById('chatSyncText');
                    if (statusDot && statusText) {
                        if (status === 'SUBSCRIBED') {
                            statusDot.className = 'rounded-circle bg-success shadow-pulse';
                            statusText.innerText = 'SYNC: SECURE_LINK_ACTIVE';
                            statusText.className = 'x-small fw-bold text-success';
                        } else if (status === 'CHANNEL_ERROR') {
                            statusDot.className = 'rounded-circle bg-danger';
                            statusText.innerText = 'SYNC: LINK_ERROR';
                            statusText.className = 'x-small fw-bold text-danger';
                        } else {
                            statusDot.className = 'rounded-circle bg-warning';
                            statusText.innerText = 'SYNC: CONNECTING...';
                            statusText.className = 'x-small fw-bold text-warning';
                        }
                    }
                });

            async function loadExistingMessages(gId) {
                const { data } = await supabase.from('messages').select(`*, profiles:sender_id(callsign)`).eq('group_id', gId).order('created_at', { ascending: true });
                if (data && gId === activeGroupId) {
                    feed.innerHTML = data.length > 0 ? data.map(m => renderMessageHtml(m)).join('') : '<div class="py-5 text-muted text-center small">QUIET FREQUENCY. START COMMS...</div>';
                    feed.scrollTop = feed.scrollHeight;
                }
            }

            const imgInput = document.getElementById('chatImageInput');
            const previewArea = document.getElementById('imagePreviewArea');
            const fileNameDisp = document.getElementById('fileNameDisplay');
            const clearImg = document.getElementById('clearImage');

            if (imgInput) {
                imgInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        selectedChatFile = file;
                        fileNameDisp.innerText = file.name.toUpperCase();
                        previewArea.classList.remove('d-none');
                    }
                };
            }
            if (clearImg) {
                clearImg.onclick = () => {
                    selectedChatFile = null;
                    previewArea.classList.add('d-none');
                    imgInput.value = '';
                };
            }

            const form = document.getElementById('chatMessageForm');
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const input = document.getElementById('chatInput');
                    const textValue = input.value.trim();
                    if (!textValue && !selectedChatFile) return false;

                    let imageUrl = null;
                    if (selectedChatFile) {
                        const fileExt = selectedChatFile.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        const filePath = `chat_assets/${groupId}/${fileName}`;
                        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, selectedChatFile);
                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                            imageUrl = publicUrl;
                        }
                    }

                    const { error: sendError } = await supabase.from('messages').insert([{
                        group_id: groupId,
                        sender_id: currentProfile.id,
                        text: textValue,
                        image_url: imageUrl
                    }]);

                    if (!sendError) {
                        input.value = '';
                        selectedChatFile = null;
                        if (previewArea) previewArea.classList.add('d-none');
                        // No need for loadMessages(groupId) here, handled by real-time listener
                    }
                    return false;
                };
            }
        }

        function renderMessageHtml(m) {
            const isMe = m.sender_id === currentProfile.id;
            const name = isMe ? 'ME' : (m.profiles?.callsign || profileCache.get(m.sender_id) || 'OPERATIVE');
            return `
                <div class="msg-line px-3 ${isMe ? 'text-end' : 'text-start'} mb-1">
                    <span class="sender small ${isMe ? 'text-primary' : 'text-dark'}" style="font-size: 0.6rem;">${name}</span>
                    <div class="msg-content d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}">
                        ${m.text ? `<span class="msg-text p-2 bg-light border ${isMe ? 'rounded-start' : 'rounded-end'}" style="max-width: 80%;">${m.text}</span>` : ''}
                        ${m.image_url ? `<img src="${m.image_url}" class="img-fluid border rounded shadow-sm mt-1" style="max-width: 200px; cursor: pointer;" onclick="window.open('${m.image_url}')">` : ''}
                    </div>
                </div>
            `;
        }

        function tacticalNotify(msg) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'tactical-toast mb-2';
            toast.innerText = msg;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        function minimalConfirm(text, onYes, isDanger = false) {
            const modalEl = document.getElementById('minimalConfirmModal');
            if (!modalEl) return;
            const modal = new bootstrap.Modal(modalEl);
            document.getElementById('confirmText').innerText = text.toUpperCase();
            const yesBtn = document.getElementById('confirmYes');
            const icon = document.getElementById('confirmIcon');

            if (isDanger) {
                yesBtn.className = 'btn btn-danger btn-xs w-100 py-2 rounded-0 text-uppercase fw-bold';
                icon.className = 'bi bi-exclamation-octagon-fill text-danger mb-3 display-6 d-block';
            } else {
                yesBtn.className = 'btn btn-warning btn-xs w-100 py-2 rounded-0 text-uppercase fw-bold';
                icon.className = 'bi bi-exclamation-triangle text-warning mb-3 display-6 d-block';
            }

            yesBtn.onclick = () => {
                onYes();
                modal.hide();
            };
            modal.show();
        }

        async function purgeHistory(groupId) {
            minimalConfirm('PURGE ALL TRANSMISSION HISTORY?', async () => {
                const { error } = await supabase.from('messages').delete().eq('group_id', groupId);
                if (!error) { loadMessages(groupId); tacticalNotify('HISTORY PURGED'); }
            }, true);
        }

        async function terminateProject(groupId) {
            minimalConfirm('TERMINATE PROJECT ENTITY PERMANENTLY?', async () => {
                const { error } = await supabase.from('groups').delete().eq('id', groupId);
                if (!error) { activeGroupId = null; showFeature('chat'); tacticalNotify('ENTITY TERMINATED'); }
            }, true);
        }

        async function leaveGroup(groupId) {
            minimalConfirm('EXIT THIS PROJECT ENTITY?', async () => {
                const { data: group } = await supabase.from('groups').select('members').eq('id', groupId).single();
                const newMembers = group.members.filter(m => m !== currentProfile.id);
                const { error } = await supabase.from('groups').update({ members: newMembers }).eq('id', groupId);
                if (!error) {
                    activeGroupId = null;
                    showFeature('chat');
                    tacticalNotify('UNIT EXITED');
                }
            });
        }

        window.tempGroupData = {};
        async function viewMembers(groupId) {
            const { data: group } = await supabase.from('groups').select('members, created_by').eq('id', groupId).single();
            const { data: profiles } = await supabase.from('profiles').select('id, callsign, avatar_url'); // Load all for adding
            const isCreator = group.created_by === currentProfile?.id;

            const groupMembers = profiles.filter(p => (group.members || []).includes(p.id));
            const nonMembers = profiles.filter(p => !(group.members || []).includes(p.id));

            const container = document.getElementById('membersListContainer');

            let html = groupMembers.map(p => `
                <div class="p-2 border-bottom d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="rounded-circle bg-dark d-flex align-items-center justify-content-center overflow-hidden" style="width: 35px; height: 35px;">
                            ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="bi bi-person text-white"></i>`}
                        </div>
                        <p class="m-0 small fw-bold text-uppercase">${p.callsign || 'AGENT'}</p>
                    </div>
                    <div class="d-flex gap-1">
                        <button class="btn btn-outline-dark btn-xs px-2" onclick="viewUserProfile('${p.id}')">Dossier</button>
                        ${isCreator && p.id !== currentProfile.id ? `<button class="btn btn-outline-danger btn-xs px-2" onclick="removeGroupMember('${groupId}', '${p.id}')"><i class="bi bi-x-lg"></i></button>` : ''}
                    </div>
                </div>
            `).join('') || '<p class="text-center text-muted small p-4">NO MEMBERS LISTED</p>';

            if (isCreator && nonMembers.length > 0) {
                html += `
                    <div class="mt-3 p-2 bg-light border">
                        <p class="x-small fw-bold text-uppercase mb-2 text-muted">Add Member</p>
                        <select class="form-select form-select-sm minimal-input-sm" id="addGroupMemberSelect" onchange="addGroupMember('${groupId}', this.value)">
                            <option value="">-- SELECT OPERATIVE --</option>
                            ${nonMembers.map(nm => `<option value="${nm.id}">${nm.callsign || 'OPERATIVE_' + nm.id.substring(0, 4)}</option>`).join('')}
                        </select>
                    </div>
                `;
            }

            container.innerHTML = html;
            window.tempGroupData[groupId] = group.members || [];

            const modalEl = document.getElementById('groupMembersModal');
            if (!modalEl.classList.contains('show')) {
                new bootstrap.Modal(modalEl).show();
            }
        }

        window.removeGroupMember = async (groupId, userId) => {
            const mems = window.tempGroupData[groupId].filter(id => id !== userId);
            await supabase.from('groups').update({ members: mems }).eq('id', groupId);
            viewMembers(groupId);
        };

        window.addGroupMember = async (groupId, userId) => {
            if (!userId) return;
            const mems = [...window.tempGroupData[groupId], userId];
            await supabase.from('groups').update({ members: mems }).eq('id', groupId);
            viewMembers(groupId);
        };

        window.viewUserProfile = async (id = null) => {
            let data;
            if (!id || id === currentProfile.id) {
                data = currentProfile;
            } else {
                const response = await supabase.from('profiles').select('*').eq('id', id).single();
                data = response.data;
            }

            if (!data) return;

            document.getElementById('dossierCallsign').innerText = (data.callsign || 'OPERATIVE').toUpperCase();
            document.getElementById('dossierID').innerText = `UID: ${data.id.substring(0, 8).toUpperCase()}`;
            document.getElementById('dossierName').innerText = (data.first_name && data.last_name) ? `${data.first_name} ${data.last_name}`.toUpperCase() : 'UNKNOWN';
            document.getElementById('dossierContact').innerText = data.telephone || 'NOT LISTED';
            document.getElementById('dossierSchool').innerText = data.school || 'NOT ASSIGNED';
            document.getElementById('dossierMajor').innerText = data.major || 'NOT ASSIGNED';
            document.getElementById('dossierGrade').innerText = data.grade || 'GRADUATING';

            const pic = document.getElementById('dossierPic');
            pic.innerHTML = data.avatar_url ? `<img src="${data.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="bi bi-person display-4 text-muted"></i>`;

            // Fetch active deployments
            const compsContainer = document.getElementById('dossierComps');
            compsContainer.innerHTML = '<div class="x-small text-muted py-1 flex-center"><div class="spinner-border spinner-border-sm" style="width: 8px; height: 8px;"></div> SCANNING...</div>';

            const { data: bookings } = await supabase.from('intelligence_booking').select('team_name, hub_id').contains('member_ids', JSON.stringify([data.id]));
            const { data: groups } = await supabase.from('groups').select('id, title, project_name').contains('members', JSON.stringify([data.id]));
            const { data: ownedHubs } = await supabase.from('intelligence_hub').select('id, title, status, tags').eq('created_by', data.id);

            let htmlString = '';
            const displayedHubs = new Set();

            // 1. Owned/Created Hubs
            if (ownedHubs && ownedHubs.length > 0) {
                htmlString += ownedHubs.map(hub => {
                    displayedHubs.add(hub.id);
                    const booking = (bookings || []).find(b => b.hub_id === hub.id);
                    const stColor = hub.status === 'ACTIVE' ? 'success' : (hub.status === 'COMPLETED' ? 'secondary' : 'dark');
                    return `
                        <div class="p-2 px-3 bg-light border-start mb-2 d-flex flex-column gap-1 hover-bg-light transition" style="border-left: 3px solid #ffc107 !important; cursor: pointer;" onclick="document.querySelector('#dossierModal .btn-close')?.click(); showFeature('news'); setTimeout(() => { const el = document.getElementById('news-card-${hub.id}'); if(el){ el.scrollIntoView({behavior: 'smooth', block: 'center'}); setTimeout(() => {el.children[0].style.boxShadow = '0 0 15px rgba(255,193,7,0.5)'; setTimeout(() => el.children[0].style.boxShadow = '', 2000);}, 300); } }, 300);" title="VIEW CREATED POST">
                            <div class="d-flex justify-content-between align-items-start">
                                <span class="fw-black text-uppercase lh-sm text-decoration-underline" style="font-size: 0.65rem; letter-spacing: 0.5px;">PROJ: ${hub.title}</span>
                                <span class="badge bg-${stColor} rounded-0 px-2 ms-2" style="font-size: 0.4rem;">${hub.status || 'OPEN'}</span>
                            </div>
                            <span class="text-muted" style="font-size: 0.55rem; line-height: 1.2;">
                                Role: <span class="fw-bold text-dark">Creator / Lead</span> ${booking ? `- <span class="text-dark fw-bold">${booking.team_name}</span>` : ''}
                            </span>
                            <span class="text-muted text-uppercase text-end" style="font-size: 0.45rem;">REF_${hub.id.substring(0, 4)}</span>
                        </div>
                    `;
                }).join('');
            }

            // 2. Booked Hubs (Where they are members)
            if (bookings && bookings.length > 0) {
                const hubIds = [...new Set(bookings.map(b => b.hub_id))];
                const { data: hubs } = await supabase.from('intelligence_hub').select('id, title, status, tags').in('id', hubIds);
                
                htmlString += bookings.map(b => {
                    if (displayedHubs.has(b.hub_id)) return ''; // Skip if already shown as creator
                    displayedHubs.add(b.hub_id);
                    const hub = (hubs || []).find(h => h.id === b.hub_id);
                    if (!hub) return '';
                    const stColor = hub.status === 'ACTIVE' ? 'success' : (hub.status === 'COMPLETED' ? 'secondary' : 'dark');
                    return `
                        <div class="p-2 px-3 bg-light border-start mb-2 d-flex flex-column gap-1 hover-bg-light transition" style="border-left: 3px solid #000 !important; cursor: pointer;" onclick="document.querySelector('#dossierModal .btn-close')?.click(); showFeature('news'); setTimeout(() => { const el = document.getElementById('news-card-${hub.id}'); if(el){ el.scrollIntoView({behavior: 'smooth', block: 'center'}); setTimeout(() => {el.children[0].style.boxShadow = '0 0 15px rgba(255,193,7,0.5)'; setTimeout(() => el.children[0].style.boxShadow = '', 2000);}, 300); } }, 300);" title="GOTO WORK GRID">
                            <div class="d-flex justify-content-between align-items-start">
                                <span class="fw-black text-uppercase lh-sm text-decoration-underline" style="font-size: 0.65rem; letter-spacing: 0.5px;">PROJ: ${hub.title}</span>
                                <span class="badge bg-${stColor} rounded-0 px-2 ms-2" style="font-size: 0.4rem;">${hub.status || 'OPEN'}</span>
                            </div>
                            <span class="text-muted" style="font-size: 0.55rem; line-height: 1.2;">
                                Working as <span class="fw-bold text-dark">${(b.team_name && b.team_name !== 'Main Roster') ? b.team_name : 'Operative'}</span>
                            </span>
                            <span class="text-muted text-uppercase text-end" style="font-size: 0.45rem;">REF_${hub.id.substring(0, 4)}</span>
                        </div>
                    `;
                }).join('');
            }

            // 3. Communications/Groups
            if (groups && groups.length > 0) {
                htmlString += groups.map(g => `
                    <div class="p-2 px-3 bg-light border-start mb-2 d-flex flex-column gap-1 hover-bg-light transition" style="border-left: 3px solid #0d6efd !important; cursor: pointer;" onclick="document.querySelector('#dossierModal .btn-close')?.click(); showFeature('chat'); setTimeout(() => window.selectGroup('${g.id}', '${g.title.replace(/'/g, "\\'")}', '${(g.project_name || '').replace(/'/g, "\\'")}'), 300);" title="GOTO COMMS">
                        <span class="fw-black text-uppercase text-decoration-underline" style="font-size: 0.6rem; letter-spacing: 0.5px;">COMMS: ${g.title}</span>
                        <span class="text-muted" style="font-size: 0.5rem;">${g.project_name || 'GENERAL COMMS'}</span>
                    </div>
                `).join('');
            }

            if (!htmlString.trim()) {
                compsContainer.innerHTML = '<p class="m-0 x-small text-muted py-1 fst-italic">NO ACTIVE DEPLOYMENTS</p>';
            } else {
                compsContainer.innerHTML = htmlString;
            }

            new bootstrap.Modal(document.getElementById('dossierModal')).show();
        }

        let selectedMembersInfo = [];
        async function loadUserSelection() {
            const container = document.getElementById('userSelectionList');
            if (!container) return;
            const { data: profiles } = await supabase.from('profiles').select('id, callsign, avatar_url');
            const renderList = (filter = '') => {
                const filtered = profiles.filter(p => (p.callsign || '').toLowerCase().includes(filter.toLowerCase()));
                container.innerHTML = filtered.map(p => `
                    <div class="user-select-item" onclick="toggleMember('${p.id}', '${p.callsign || 'OPERATIVE'}', '${p.avatar_url || ''}')">
                        <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center overflow-hidden" style="width: 25px; height: 25px;">
                            ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="bi bi-person small"></i>`}
                        </div>
                        <span style="font-size: 0.7rem;" class="fw-bold text-uppercase">${p.callsign || 'OPERATIVE'}</span>
                    </div>
                `).join('') || '<p class="text-center text-muted x-small p-2">NO MATCHES</p>';
            };
            document.getElementById('userSearchInput')?.addEventListener('input', (e) => renderList(e.target.value));
            renderList();
        }

        window.toggleMember = (id, callsign, avatar) => {
            const existing = selectedMembersInfo.find(m => m.id === id);
            if (!existing) {
                selectedMembersInfo.push({ id, callsign, avatar });
            } else {
                selectedMembersInfo = selectedMembersInfo.filter(m => m.id !== id);
            }
            renderChips();
        };

        function renderChips() {
            const area = document.getElementById('selectedMembersArea');
            area.innerHTML = selectedMembersInfo.map(m => `
                <div class="member-chip py-1 px-2 mb-1" style="border-radius: 4px; background: #e9ecef; font-size: 0.6rem;">
                    <div class="d-flex align-items-center gap-1">
                        ${m.avatar ? `<img src="${m.avatar}" style="width: 15px; height: 15px; border-radius: 50%;">` : ''}
                        <span>${m.callsign}</span>
                        <i class="bi bi-x-lg ms-1" style="cursor:pointer" onclick="toggleMember('${m.id}')"></i>
                    </div>
                </div>
            `).join('');
        }

        // --- EVENT SHARE LOGIC ---
        let eventSelectedMembersInfo = [];
        async function loadEventUserSelection() {
            const container = document.getElementById('eventUserSelectionList');
            if (!container) return;
            const { data: profiles } = await supabase.from('profiles').select('id, callsign, avatar_url');
            const renderList = (filter = '') => {
                const filtered = profiles.filter(p => (p.callsign || '').toLowerCase().includes(filter.toLowerCase()));
                container.innerHTML = filtered.map(p => `
                    <div class="user-select-item" onclick="toggleEventMember('${p.id}', '${p.callsign || 'OPERATIVE'}', '${p.avatar_url || ''}')">
                        <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center overflow-hidden" style="width: 25px; height: 25px;">
                            ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="bi bi-person small"></i>`}
                        </div>
                        <span style="font-size: 0.7rem;" class="fw-bold text-uppercase">${p.callsign || 'OPERATIVE'}</span>
                    </div>
                `).join('') || '<p class="text-center text-muted x-small p-2">NO MATCHES</p>';
            };
            document.getElementById('eventUserSearchInput')?.addEventListener('input', (e) => renderList(e.target.value));
            renderList();
        }

        window.toggleEventMember = (id, callsign, avatar) => {
            const existing = eventSelectedMembersInfo.find(m => m.id === id);
            if (!existing) {
                eventSelectedMembersInfo.push({ id, callsign, avatar });
            } else {
                eventSelectedMembersInfo = eventSelectedMembersInfo.filter(m => m.id !== id);
            }
            renderEventChips();
        };

        function renderEventChips() {
            const area = document.getElementById('eventSelectedMembersArea');
            if (!area) return;
            area.innerHTML = eventSelectedMembersInfo.map(m => `
                <div class="member-chip py-1 px-2 mb-1" style="border-radius: 4px; background: #e9ecef; font-size: 0.6rem;">
                    <div class="d-flex align-items-center gap-1">
                        ${m.avatar ? `<img src="${m.avatar}" style="width: 15px; height: 15px; border-radius: 50%;">` : ''}
                        <span>${m.callsign}</span>
                        <i class="bi bi-x-lg ms-1" style="cursor:pointer" onclick="toggleEventMember('${m.id}')"></i>
                    </div>
                </div>
            `).join('');
        }

        // --- COMMUNICATION HUB LOGIC ---
        async function loadPersonnel() {
            const usersList = document.getElementById('usersList');
            if (!usersList) return;
            const { data: profiles, error } = await supabase.from('profiles').select('*');
            if (error) {
                usersList.innerHTML = `<div class="text-center p-4 text-danger small">ERROR FETCHING PERSONNEL: ${error.message}</div>`;
                return;
            }
            usersList.innerHTML = profiles.map(p => `
                <div class="d-flex align-items-center justify-content-between p-3 mb-2 bg-white border rounded shadow-sm">
                    <div class="d-flex align-items-center gap-3">
                        <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; overflow: hidden;">
                            ${p.avatar_url ? `<img src="${p.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="bi bi-person"></i>`}
                        </div>
                        <div>
                            <p class="m-0 fw-bold small text-uppercase">${p.callsign || 'UNKNOWN'}</p>
                            <p class="m-0 text-muted" style="font-size: 0.65rem;">${p.major || 'NOT ASSIGNED'} | ${p.nickname || p.email}</p>
                        </div>
                    </div>
                    <button class="btn btn-outline-dark btn-xs text-uppercase fw-bold px-3">Connect</button>
                </div>
            `).join('');
        }

        // --- CALENDAR LOGIC ---
        function initCalendar() {
            const calendarEl = document.getElementById('calendar');
            if (calendarEl && !calendar) {
                calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    headerToolbar: {
                        left: 'prevYear,prev,next,nextYear today',
                        center: 'title',
                        right: 'multiMonthYear,dayGridMonth,listMonth'
                    },
                    themeSystem: 'bootstrap5',
                    selectable: true,
                    dateClick: function (info) {
                        const modal = new bootstrap.Modal(document.getElementById('addEventModal'));
                        document.getElementById('eventStartDate').value = info.dateStr;
                        modal.show();
                    },
                    eventClick: function (info) {
                        const evt = info.event;
                        const props = evt.extendedProps;
                        document.getElementById('viewEventTitle').innerText = evt.title.toUpperCase();
                        document.getElementById('viewEventID').innerText = `TAG: ${evt.id.substring(0, 8).toUpperCase()}`;
                        document.getElementById('viewEventScope').innerText = props.scope || 'PERSONAL';
                        document.getElementById('viewEventDescription').innerText = props.description || 'NO ADDITIONAL NOTES';
                        const start = evt.start ? new Date(evt.start).toLocaleString() : '--';
                        document.getElementById('viewEventTime').innerText = evt.allDay ? `${evt.startStr}` : `${start}`;
                        const taskArea = document.getElementById('viewEventTaskStatus');
                        taskArea.innerHTML = props.is_task ? '<span class="badge bg-warning text-dark rounded-0 px-2 py-1" style="font-size:0.5rem">HIGH PRIORITY TASK</span>' : '';
                        const adminActions = document.getElementById('eventAdminActions');
                        if (props.created_by === currentProfile?.id) {
                            adminActions.classList.remove('d-none');
                            document.getElementById('editEventBtn').onclick = () => {
                                bootstrap.Modal.getInstance(document.getElementById('viewEventModal')).hide();
                                document.getElementById('eventId').value = evt.id;
                                document.getElementById('eventTitle').value = evt.title;
                                document.getElementById('eventScope').value = props.scope || 'personal';
                                document.getElementById('eventIsTask').checked = props.is_task || false;
                                document.getElementById('eventDescription').value = props.description || '';

                                if (evt.start) {
                                    document.getElementById('eventStartDate').value = new Date(evt.start).toISOString().split('T')[0];
                                    if (!evt.allDay) document.getElementById('eventStartTime').value = new Date(evt.start).toTimeString().substring(0, 5);
                                }
                                if (evt.end) {
                                    document.getElementById('eventEndDate').value = new Date(evt.end).toISOString().split('T')[0];
                                    if (!evt.allDay) document.getElementById('eventEndTime').value = new Date(evt.end).toTimeString().substring(0, 5);
                                }

                                document.getElementById('addEventModalTitle').innerText = 'UPDATE MISSION ENTRY';
                                document.getElementById('addEventSubmitBtn').innerText = 'SAVE CHANGES';

                                // Fetch current shared members
                                if (props.shared_with && props.shared_with.length > 0) {
                                    supabase.from('profiles')
                                        .select('id, callsign, avatar_url')
                                        .in('id', props.shared_with)
                                        .then(({ data: sharedUsers }) => {
                                            if (sharedUsers) {
                                                eventSelectedMembersInfo = sharedUsers;
                                                renderEventChips();
                                            }
                                        });
                                } else {
                                    eventSelectedMembersInfo = [];
                                    renderEventChips();
                                }

                                new bootstrap.Modal(document.getElementById('addEventModal')).show();
                            };

                            // Inline Deletion Logic
                            document.getElementById('deleteEventBtn').onclick = () => {
                                document.getElementById('eventAdminActions').classList.add('d-none');
                                document.getElementById('deleteConfirmActions').classList.remove('d-none');
                                document.getElementById('closeEventViewBtn').classList.add('d-none');
                            };

                            document.getElementById('cancelDeleteEventBtn').onclick = () => {
                                document.getElementById('deleteConfirmActions').classList.add('d-none');
                                document.getElementById('eventAdminActions').classList.remove('d-none');
                                document.getElementById('closeEventViewBtn').classList.remove('d-none');
                            };

                            document.getElementById('confirmDeleteEventBtn').onclick = async () => {
                                const { error } = await supabase.from('calendar_events').delete().eq('id', evt.id);
                                if (!error) {
                                    bootstrap.Modal.getInstance(document.getElementById('viewEventModal')).hide();
                                    calendar?.refetchEvents();
                                    tacticalNotify('MISSION REMOVED');
                                } else {
                                    tacticalNotify('ERROR: ' + error.message);
                                }
                            };
                        } else {
                            adminActions.classList.add('d-none');
                        }

                        // Reset view state when opening
                        document.getElementById('deleteConfirmActions').classList.add('d-none');
                        document.getElementById('closeEventViewBtn').classList.remove('d-none');

                        new bootstrap.Modal(document.getElementById('viewEventModal')).show();
                    },
                    events: async (info, successCallback, failureCallback) => {
                        const isTasksOnly = document.getElementById('viewTasksOnly')?.checked;
                        const isPersonalOnly = document.getElementById('scopePersonalMain')?.checked;

                        const { data, error } = await supabase.from('calendar_events').select('*');
                        if (error) successCallback([]);
                        else {
                            const uid = currentProfile?.id;
                            let filtered = data.filter(e =>
                                e.scope === 'global' ||
                                e.created_by === uid ||
                                (e.shared_with && e.shared_with.includes(uid))
                            );

                            if (isPersonalOnly) {
                                filtered = filtered.filter(e => e.scope !== 'global' || e.created_by === uid);
                            } else {
                                // If Global radio is selected, we show all (Global + Personal)
                            }

                            if (isTasksOnly) filtered = filtered.filter(e => e.is_task);
                            successCallback(filtered);
                        }
                    },
                    eventDidMount: function (info) {
                        if (info.event.extendedProps.is_task) info.el.style.borderLeft = '4px solid #ffc107';
                        if (info.event.extendedProps.scope === 'global') {
                            info.el.style.backgroundColor = '#000';
                            info.el.style.borderColor = '#000';
                        }
                    }
                });
                calendar.render();

                // View Toggles
                document.getElementById('viewGridBtn')?.addEventListener('click', () => {
                    calendar.changeView('dayGridMonth');
                    document.getElementById('viewGridBtn').classList.add('active');
                    document.getElementById('viewListBtn').classList.remove('active');
                });
                document.getElementById('viewListBtn')?.addEventListener('click', () => {
                    calendar.changeView('listMonth');
                    document.getElementById('viewListBtn').classList.add('active');
                    document.getElementById('viewGridBtn').classList.remove('active');
                });
                document.getElementById('viewTasksOnly')?.addEventListener('change', () => calendar.refetchEvents());
                document.getElementById('scopeGlobalMain')?.addEventListener('change', () => calendar.refetchEvents());
                document.getElementById('scopePersonalMain')?.addEventListener('change', () => calendar.refetchEvents());
            }
        }



        // --- GLOBAL TRIGGERS ---
        document.getElementById('homeBtn')?.addEventListener('click', () => toggleFeature('home'));
        document.getElementById('chatBtn')?.addEventListener('click', () => toggleFeature('chat'));
        document.getElementById('calendarBtn')?.addEventListener('click', () => toggleFeature('calendar'));
        document.getElementById('newsBtn')?.addEventListener('click', () => toggleFeature('news'));
        document.getElementById('classBtn')?.addEventListener('click', () => toggleFeature('class'));

        const groupForm = document.getElementById('newGroupFormGeneral');
        if (groupForm) {
            groupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('groupTitleMain').value;
                const projectName = document.getElementById('groupProjectMain').value;
                const linkedHubId = document.getElementById('groupLinkedHubId').value || null;
                const memberIds = selectedMembersInfo.map(m => m.id);

                // Ensure creator is always in the group
                if (!memberIds.includes(currentProfile.id)) {
                    memberIds.push(currentProfile.id);
                }

                const { error } = await supabase.from('groups').insert([{
                    title,
                    project_name: projectName,
                    linked_hub_id: linkedHubId,
                    members: memberIds,
                    created_by: currentProfile.id
                }]);

                if (error) tacticalNotify('ERROR: ' + error.message);
                else {
                    bootstrap.Modal.getInstance(document.getElementById('createGroupModal')).hide();
                    groupForm.reset();
                    selectedMembersInfo = [];
                    renderChips();
                    if (document.getElementById('groupsSidebarList')) loadGroups();
                    tacticalNotify('UNIT INITIALIZED');
                }
            });
        }

        // Add Event logic
        document.getElementById('addEventForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const eventId = document.getElementById('eventId').value;
            const title = document.getElementById('eventTitle').value;
            const startDate = document.getElementById('eventStartDate').value;
            const endDate = document.getElementById('eventEndDate').value;
            const startTime = document.getElementById('eventStartTime').value;
            const endTime = document.getElementById('eventEndTime').value;
            const scope = document.getElementById('eventScope').value;
            const isTask = document.getElementById('eventIsTask').checked;
            const description = document.getElementById('eventDescription').value;

            let startISO = startDate;
            if (startTime) {
                startISO = new Date(`${startDate}T${startTime}`).toISOString();
            }

            let endISO = endDate || startDate;
            if (endTime) {
                endISO = new Date(`${endDate || startDate}T${endTime}`).toISOString();
            } else if (endDate && !endTime) {
                const d = new Date(endDate);
                d.setDate(d.getDate() + 1);
                endISO = d.toISOString().split('T')[0];
            }

            const memberIds = eventSelectedMembersInfo.map(m => m.id);

            const newEvent = {
                title,
                start: startISO,
                end: endISO !== startISO ? endISO : null,
                scope,
                is_task: isTask,
                shared_with: memberIds,
                description: description
            };

            let reqError = null;
            if (eventId) {
                const { error } = await supabase.from('calendar_events').update(newEvent).eq('id', eventId);
                reqError = error;
            } else {
                newEvent.created_by = currentProfile?.id;
                const { error } = await supabase.from('calendar_events').insert([newEvent]);
                reqError = error;
            }

            if (reqError) {
                tacticalNotify('ERROR: ' + reqError.message);
            } else {
                bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();
                e.target.reset();
                document.getElementById('eventId').value = '';
                eventSelectedMembersInfo = [];
                renderEventChips();
                // Reset button/title in case it was Edit
                document.getElementById('addEventModalTitle').innerText = 'CALENDAR ENTRY / MISSION PLAN';
                document.getElementById('addEventSubmitBtn').innerText = 'COMMIT TO MISSION BOARD';

                calendar?.refetchEvents();
                tacticalNotify(eventId ? 'MISSION UPDATED' : 'MISSION BOARD UPDATED');
            }
        });

        // Handle Profile Update
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const saveStatus = document.getElementById('saveStatus');
                saveStatus.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> UPLOADING...';
                saveStatus.className = 'small text-primary tracking-wider text-uppercase';
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Authentication failed');
                    let avatarUrl = currentProfile ? currentProfile.avatar_url : null;
                    if (selectedFile) {
                        const fileExt = selectedFile.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        const filePath = `${user.id}/${fileName}`;
                        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, selectedFile);
                        if (uploadError) throw uploadError;
                        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                        avatarUrl = publicUrl;
                    }
                    const updatedData = {
                        id: user.id,
                        first_name: document.getElementById('edit-first-name').value,
                        last_name: document.getElementById('edit-last-name').value,
                        nickname: document.getElementById('edit-nickname').value,
                        callsign: document.getElementById('edit-callsign').value,
                        telephone: document.getElementById('edit-telephone').value,
                        school: document.getElementById('edit-school').value,
                        grade: document.getElementById('edit-grade').value,
                        major: document.getElementById('edit-major').value,
                        birthdate: document.getElementById('edit-birthdate').value,
                        avatar_url: avatarUrl,
                        updated_at: new Date()
                    };
                    const { error: updateError } = await supabase.from('profiles').upsert(updatedData);
                    if (updateError) throw updateError;
                    saveStatus.innerHTML = '<i class="bi bi-check2-all"></i> DOSSIER SYNCHRONIZED';
                    saveStatus.className = 'small text-success tracking-wider text-uppercase';
                    setTimeout(() => {
                        bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
                        loadUserInfo();
                        saveStatus.innerHTML = '<i class="bi bi-cpu me-2"></i> READY';
                        saveStatus.className = 'small text-muted opacity-50 tracking-wider text-uppercase';
                    }, 1500);
                } catch (error) {
                    console.error('Update failed:', error);
                    saveStatus.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ERROR: ${error.message}`;
                    saveStatus.className = 'small text-danger tracking-wider text-uppercase';
                }
            });
        }

        // --- UTILITY FUNCTIONS ---
        window.tacticalNotify = (msg) => {
            const toast = document.createElement('div');
            toast.className = 'tactical-toast px-4 py-2 border border-dark bg-black text-white fw-bold tracking-widest text-uppercase shadow-lg';
            toast.style = 'position:fixed; bottom:20px; right:20px; z-index:9999; font-size:0.6rem; animation: slideIn 0.3s ease forwards;';
            toast.innerHTML = `<i class="bi bi-cpu me-2 text-warning"></i> ${msg}`;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        };



        // Call global sync init
        initRealtimeSync();

        async function initRealtimeSync() {
            // One-time group sync
            supabase.channel('global-groups-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
                    if (chatInitialized) loadGroups();
                })
                .subscribe();
        }

        // --- INITIALIZATION ---
        supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                console.log('SESSION_ACTIVE:', event);
                loadUserInfo();
            } else if (event === 'SIGNED_OUT') {
                window.location.href = 'authen/login.html';
            }
        });

        // Trigger initial check
        loadUserInfo();
