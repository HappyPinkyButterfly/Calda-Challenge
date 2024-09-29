export class Order {
    uporabnik_id:string;
    naslov_za_dostavo:string;
    prejemnik:string;

    constructor(uporabnik_id:string,naslov_za_dostavo:string,prejemnik:string){
        this.uporabnik_id = uporabnik_id;
        this.naslov_za_dostavo = naslov_za_dostavo;
        this.prejemnik = prejemnik;
    }
}