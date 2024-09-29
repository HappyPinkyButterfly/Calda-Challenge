// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// // This enables autocomplete, go to definition, etc.

// // Setup type definitions for built-in Supabase Runtime APIs
// import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// import {Order} from './order.ts';

// console.log("Hello from Functions!")

// Deno.serve(async (req) => {
//   const  order:Order  = await req.json()
//   const data = {
//     message: order,
//   }
//   console.log(order)

//   return new Response(
//     JSON.stringify(data),
//     { headers: { "Content-Type": "application/json" } },
//   )
// })

// /* To invoke locally:

//   1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
//   2. Make an HTTP request:

//   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/order_calc' \
//     --header 'Authorization: Bearer ' \
//     --header 'Content-Type: application/json' \
//     --data '{"name":"Functions"}'

// */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method === "POST") {
    const { uporabnik_id, naslov_za_dostavo, prejemnik, izdelki } = await req
      .json();

    console.log(uporabnik_id);
    console.log(naslov_za_dostavo);
    console.log(prejemnik);
    const { data: noviNaročilo, error: naročiloNapaka } = await supabase
      .from("naročila")
      .insert({
        uporabnik_id,
        naslov_za_dostavo,
        prejemnik,
      })
      .select();

    console.log("uspeh");

    if (naročiloNapaka) {
      console.log(naročiloNapaka);
      console.log(noviNaročilo);
      console.log("FAIL");

      return new Response(JSON.stringify({ error: naročiloNapaka.message }), {
        status: 400,
      });
    }

    // Vstavi naročilo izdelke
    console.log(noviNaročilo);
    const naročiloId = noviNaročilo[0].id; // Predpostavljamo, da je id prvi v vrnjenem nizu
    for (const izdelek of izdelki) {
      const { error } = await supabase
        .from("naročilo_izdelki")
        .insert({
          naročilo_id: naročiloId,
          izdelek_id: izdelek.id,
          količina: izdelek.kolicina,
        });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }
    }

    // Izračunaj skupno vrednost vseh naročil
    const { data: vseNaročila, error: naročilaNapaka } = await supabase
      .from("naročilo_izdelki")
      .select("količina, izdelek_id");

    if (naročilaNapaka) {
      return new Response(JSON.stringify({ error: naročilaNapaka.message }), {
        status: 400,
      });
    }

    // Pridobi cene izdelkov
    // deno-lint-ignore no-explicit-any
    const izdelkiId = vseNaročila.map((n: any) => n.izdelek_id);
    const { data: vseIzdelki, error: izdelkiNapaka } = await supabase
      .from("izdelki")
      .select("id, cena")
      .in("id", izdelkiId);

    if (izdelkiNapaka) {
      return new Response(JSON.stringify({ error: izdelkiNapaka.message }), {
        status: 400,
      });
    }

    // Izračunaj skupno vrednost
    let skupnaVsota = 0;
    for (const naročilo of vseNaročila) {
      for (const izdelek of vseIzdelki) {
        if (naročilo.izdelek_id == izdelek.id) {
          skupnaVsota += izdelek.cena * naročilo.količina;
        }
      }
    }

    return new Response(JSON.stringify({ skupnaVsota }), { status: 200 });
  }

  return new Response("Only POST requests are allowed", { status: 405 });
});
