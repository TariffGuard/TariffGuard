// API Base URL
const API_BASE = 'http://localhost:8000';

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Load data for the tab
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'factories':
            loadFactories();
            break;
        case 'machines':
            loadMachines();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'tariffs':
            loadTariffs();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        // Load KPIs
        const factories = await fetchAPI('/api/factories/');
        const machines = await fetchAPI('/api/machines/');
        const orders = await fetchAPI('/api/orders/');
        
        document.getElementById('kpi-factories').textContent = factories.length;
        document.getElementById('kpi-machines').textContent = machines.length;
        document.getElementById('kpi-orders').textContent = orders.length;
        
        // Load tariffs count
        try {
            const tariffs = await fetchAPI('/api/tariffs/');
            document.getElementById('kpi-tariffs').textContent = tariffs.length;
        } catch (e) {
            document.getElementById('kpi-tariffs').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// Factories
function showAddFactoryForm() {
    document.getElementById('factoryForm').classList.toggle('hidden');
}

document.getElementById('addFactoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const factoryData = {
        name: document.getElementById('factoryName').value,
        location: document.getElementById('factoryLocation').value,
        tariff_category: document.getElementById('factoryTariff').value,
        sanctioned_load_kw: parseFloat(document.getElementById('factoryLoad').value),
        solar_capacity_kw: parseFloat(document.getElementById('factorySolar').value),
        operating_hours: "08:00-22:00"
    };
    
    try {
        await fetchAPI('/api/factories/', 'POST', factoryData);
        alert('Factory created successfully!');
        document.getElementById('factoryForm').classList.add('hidden');
        document.getElementById('addFactoryForm').reset();
        loadFactories();
    } catch (error) {
        alert('Error creating factory: ' + error.message);
    }
});

async function loadFactories() {
    try {
        const factories = await fetchAPI('/api/factories/');
        const container = document.getElementById('factoriesList');
        
        if (factories.length === 0) {
            container.innerHTML = '<p style="color: white;">No factories found. Add one!</p>';
            return;
        }
        
        container.innerHTML = factories.map(factory => `
            <div class="card">
                <h3>🏭 ${factory.name}</h3>
                <p><strong>Location:</strong> ${factory.location || 'N/A'}</p>
                <p><strong>Tariff:</strong> ${factory.tariff_category || 'N/A'}</p>
                <p><strong>Load:</strong> ${factory.sanctioned_load_kw} kW</p>
                <p><strong>Solar:</strong> ${factory.solar_capacity_kw} kW</p>
                <p><strong>ID:</strong> ${factory.id}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading factories:', error);
    }
}

// Machines
function showAddMachineForm() {
    document.getElementById('machineForm').classList.toggle('hidden');
}

document.getElementById('addMachineForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const machineData = {
        factory_id: parseInt(document.getElementById('machineFactoryId').value),
        name: document.getElementById('machineName').value,
        machine_type: document.getElementById('machineType').value,
        power_kw: parseFloat(document.getElementById('machinePower').value),
        shiftable: document.getElementById('machineShiftable').checked,
        min_run_minutes: 60,
        setup_minutes: 15,
        priority: 1
    };
    
    try {
        await fetchAPI('/api/machines/', 'POST', machineData);
        alert('Machine created successfully!');
        document.getElementById('machineForm').classList.add('hidden');
        document.getElementById('addMachineForm').reset();
        loadMachines();
    } catch (error) {
        alert('Error creating machine: ' + error.message);
    }
});

async function loadMachines() {
    try {
        const machines = await fetchAPI('/api/machines/');
        const container = document.getElementById('machinesList');
        
        if (machines.length === 0) {
            container.innerHTML = '<p style="color: white;">No machines found. Add one!</p>';
            return;
        }
        
        container.innerHTML = machines.map(machine => `
            <div class="card">
                <h3>🔧 ${machine.name}</h3>
                <p><strong>Type:</strong> ${machine.machine_type}</p>
                <p><strong>Power:</strong> ${machine.power_kw} kW</p>
                <p><strong>Shiftable:</strong> ${machine.shiftable ? 'Yes' : 'No'}</p>
                <p><strong>Factory ID:</strong> ${machine.factory_id}</p>
                <p><strong>ID:</strong> ${machine.id}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading machines:', error);
    }
}

// Orders
function showAddOrderForm() {
    document.getElementById('orderForm').classList.toggle('hidden');
}

document.getElementById('addOrderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderData = {
        factory_id: parseInt(document.getElementById('orderFactoryId').value),
        order_no: document.getElementById('orderNo').value,
        process: document.getElementById('orderProcess').value,
        quantity: parseFloat(document.getElementById('orderQuantity').value),
        duration_minutes: parseInt(document.getElementById('orderDuration').value),
        deadline: document.getElementById('orderDeadline').value,
        priority: 2
    };
    
    try {
        await fetchAPI('/api/orders/', 'POST', orderData);
        alert('Order created successfully!');
        document.getElementById('orderForm').classList.add('hidden');
        document.getElementById('addOrderForm').reset();
        loadOrders();
    } catch (error) {
        alert('Error creating order: ' + error.message);
    }
});

async function loadOrders() {
    try {
        const orders = await fetchAPI('/api/orders/');
        const container = document.getElementById('ordersList');
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="color: white;">No orders found. Add one!</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="card">
                <h3>📋 ${order.order_no}</h3>
                <p><strong>Process:</strong> ${order.process}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                <p><strong>Duration:</strong> ${order.duration_minutes} min</p>
                <p><strong>Deadline:</strong> ${new Date(order.deadline).toLocaleString()}</p>
                <p><span class="status-badge status-${order.status}">${order.status}</span></p>
                <p><strong>ID:</strong> ${order.id}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Tariffs
function showAddTariffForm() {
    document.getElementById('tariffForm').classList.toggle('hidden');
}

document.getElementById('addTariffForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tariffData = {
        category: document.getElementById('tariffCategory').value,
        period_name: document.getElementById('tariffPeriod').value,
        start_time: document.getElementById('tariffStart').value,
        end_time: document.getElementById('tariffEnd').value,
        rate_pkr_per_kwh: parseFloat(document.getElementById('tariffRate').value),
        effective_from: new Date().toISOString().split('T')[0],
        source: "Manual Entry"
    };
    
    try {
        await fetchAPI('/api/tariffs/', 'POST', tariffData);
        alert('Tariff created successfully!');
        document.getElementById('tariffForm').classList.add('hidden');
        document.getElementById('addTariffForm').reset();
        loadTariffs();
    } catch (error) {
        alert('Error creating tariff: ' + error.message);
    }
});

async function loadTariffs() {
    try {
        const tariffs = await fetchAPI('/api/tariffs/');
        const container = document.getElementById('tariffsList');
        
        if (tariffs.length === 0) {
            container.innerHTML = '<p style="color: white;">No tariffs found. Add one!</p>';
            return;
        }
        
        container.innerHTML = tariffs.map(tariff => `
            <div class="card">
                <h3>💰 ${tariff.period_name}</h3>
                <p><strong>Category:</strong> ${tariff.category}</p>
                <p><strong>Time:</strong> ${tariff.start_time} - ${tariff.end_time}</p>
                <p><strong>Rate:</strong> Rs. ${tariff.rate_pkr_per_kwh}/kWh</p>
                <p><strong>Effective:</strong> ${tariff.effective_from}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tariffs:', error);
    }
}

// API Helper
async function fetchAPI(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
}

// Load dashboard on page load
window.onload = function() {
    loadDashboard();
};