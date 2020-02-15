<script>
    import Cookies from 'js-cookie';

    export let onSetApiKey;
    let apiKeyInput;
</script>
<style>
    .overlay {
        display: flex;
        position: absolute;
        width: 100vw;
        height: 100vh;
        top: 0;
        background-color: rgba(0, 0, 0, 0.5);
        
    }
    .box {
        margin: auto;
        background-color: rgb(90, 90, 90);
        border-radius: 10px;
        height: 100px;
        padding: 10px;
    }
</style>
<div class="overlay">
    <div class="box">
        <p>
        Since the weather API runs from your browser, you will need an API key, which you can obtain here: <a href="https://openweathermap.org/home/sign_up">here</a>
        </p>
        <input bind:value={apiKeyInput} placeholder="API key">
        <br>
        You will only need to perform this process one
        <br>
        <button on:click={function(){onSetApiKey(apiKeyInput)}}>submit</button>
    </div>
</div>