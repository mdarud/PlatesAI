<script lang="ts">
  import { createIcon, type IconName } from '../utils/icons';
  import { currentSection, type Section } from '../stores/navigationStore';
  
  // Navigation items
  const navItems: Array<{id: Section, label: string, icon: IconName}> = [
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'recipes', label: 'Recipes', icon: 'recipe' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory' },
    { id: 'grocery', label: 'Grocery', icon: 'grocery' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];
  
  // Set active section
  function setActiveSection(id: Section) {
    currentSection.set(id);
  }
</script>

<div class="sidebar-container">
  <!-- App Logo -->
  <div class="logo-container">
    <div class="logo">
      <div class="logo-icon">
        <span class="plate-icon">🍽️</span>
        <span class="food-icon">🥘</span>
      </div>
      <span class="logo-text">Plates<span class="accent">AI</span></span>
    </div>
  </div>
  
  <!-- Navigation Menu -->
  <nav class="nav-menu">
    <ul>
      {#each navItems as item}
        <li 
          class="nav-item {$currentSection === item.id ? 'active' : ''}"
          on:click={() => setActiveSection(item.id)}
          on:keydown={(e) => e.key === 'Enter' && setActiveSection(item.id)}
          tabindex="0"
          role="button"
          aria-pressed={$currentSection === item.id}
        >
          <span class="nav-icon">
            {@html createIcon(item.icon, 20)}
          </span>
          <span class="nav-label">{item.label}</span>
        </li>
      {/each}
    </ul>
  </nav>
  
  <!-- User Profile -->
  <div class="user-profile">
    <div class="user-avatar">
      <span class="avatar-placeholder">
        {@html createIcon('users', 20)}
      </span>
    </div>
    <div class="user-info">
      <span class="user-name">User</span>
      <span class="user-status">Alpha Version</span>
    </div>
  </div>
  
  <!-- About Section -->
  <div class="about-section">
    <h4 class="about-title">Created by</h4>
    <div class="creator-info">
      <span class="creator-name">Daru</span>
      <div class="creator-links">
        <a href="https://github.com/mdarud" target="_blank" rel="noopener noreferrer" class="creator-link">
          <span class="link-text">github.com/mdarud</span>
        </a>
        <a href="https://linkedin.com/in/drmksm" target="_blank" rel="noopener noreferrer" class="creator-link">
          <span class="link-text">linkedin.com/in/drmksm</span>
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  .sidebar-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--surface-white);
    border-right: 1px solid var(--border-light);
  }
  
  /* Logo */
  .logo-container {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-light);
  }
  
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }
  
  .logo-icon {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .plate-icon {
    position: absolute;
    font-size: 2rem;
    z-index: 1;
  }
  
  .food-icon {
    position: absolute;
    font-size: 1.2rem;
    z-index: 2;
    transform: translateY(-2px);
  }
  
  .logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-dark);
    font-family: var(--font-accent);
    letter-spacing: 0.5px;
  }
  
  .logo-text .accent {
    color: var(--primary);
    font-weight: 800;
  }
  
  /* Navigation Menu */
  .nav-menu {
    flex: 1;
    padding: 1rem 0;
    overflow-y: auto;
  }
  
  .nav-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 0.5rem;
    margin: 0.25rem 0.75rem;
    color: var(--text-muted);
  }
  
  .nav-item:hover {
    background: var(--surface-hover);
    color: var(--text-dark);
  }
  
  .nav-item.active {
    background: var(--primary-light);
    color: var(--primary);
    font-weight: 500;
  }
  
  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  
  .nav-label {
    font-size: 1rem;
  }
  
  /* User Profile */
  .user-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border-light);
    margin-top: auto;
    margin-bottom: 0;
  }
  
  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--surface-light);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
  }
  
  .user-name {
    font-weight: 500;
    color: var(--text-dark);
  }
  
  .user-status {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  
  /* About Section */
  .about-section {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--border-light);
    font-size: 0.85rem;
  }
  
  .about-title {
    margin: 0 0 0.5rem 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    font-weight: 600;
  }
  
  .creator-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .creator-name {
    font-weight: 500;
    color: var(--text-dark);
  }
  
  .creator-links {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .creator-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--primary);
    text-decoration: none;
    font-size: 0.75rem;
    transition: color 0.2s ease;
  }
  
  .creator-link:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }
  
  .link-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  @media (max-width: 768px) {
    .logo-container {
      padding: 1rem;
    }
    
    .nav-item {
      padding: 0.5rem 1rem;
      margin: 0.25rem 0.5rem;
    }
    
    .user-profile {
      padding: 0.75rem 1rem;
    }
    
    .about-section {
      padding: 0.75rem 1rem;
    }
  }
</style>
