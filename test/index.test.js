const { getColorFromURL, getPaletteFromURL } = require('../src/color-thief');
const chalk = require('chalk');

(async () => {
    try {
        const imageURLs = [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/International_Pok%C3%A9mon_logo.svg/1200px-International_Pok%C3%A9mon_logo.svg.png',
            'https://i2-prod.mirror.co.uk/incoming/article7731571.ece/ALTERNATES/s298/Pokemon-charmander.png',
            'https://tvseriesfinale.com/wp-content/uploads/2016/05/Poke%CC%81mon-TV-show-canceled-or-renewed-Pikachu.-e1464721992451.png',
            'https://i.etsystatic.com/8838968/r/il/9958ec/1063677896/il_570xN.1063677896_fm8r.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Pokebola-pokeball-png-0.png/769px-Pokebola-pokeball-png-0.png',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Firefox_Logo%2C_2017.svg/1024px-Firefox_Logo%2C_2017.svg.png'
        ];

        for (i = 0; i < imageURLs.length; i++) {
            const dominantColor = await getColorFromURL(imageURLs[i]);
            const colorPalette = await getPaletteFromURL(imageURLs[i]);
            const [r, g, b] = dominantColor;
            console.log(
                'Dominant Color:',
                chalk.rgb(r, g, b)(`rgb(${r}, ${g}, ${b})`)
            );
            console.log('Color Pallete:\n', colorPalette);
        }
    } catch (error) {
        console.error(error);
    }
})();
