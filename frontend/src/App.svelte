<script>
  import Chat from './components/Chat.svelte';
</script>

<main>
  <div class="container">
    <h1>AI Support Chat</h1>
    <Chat />
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    background: #f5f5f5;
  }

  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
  }

  .container {
    width: 100%;
    max-width: 800px;
  }

  h1 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
  }
</style>
