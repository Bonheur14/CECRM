const formidable = require("formidable");
const fs = require("fs");
const FormData = require("form-data");

const TELEGRAM_API = "https://api.telegram.org";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export const config = {
    api: {
        bodyParser: false
    }
};


function jsonResponse(res, status, data) {

    res.status(status);

    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );

    res.end(JSON.stringify(data));
}


function getValue(field) {

    if (Array.isArray(field)) {
        return field[0] || "";
    }

    return field || "";
}


function escapeTelegram(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


function parseForm(req) {

    return new Promise((resolve, reject) => {

        const form = formidable({
            multiples: false,
            maxFileSize: MAX_FILE_SIZE,
            keepExtensions: true
        });

        form.parse(req, (error, fields, files) => {

            if (error) {
                reject(error);
                return;
            }

            resolve({
                fields,
                files
            });

        });

    });

}


async function sendTelegramMessage(
    botToken,
    chatId,
    message
) {

    const url =
        `${TELEGRAM_API}/bot${botToken}/sendMessage`;

    const response = await fetch(url, {

        method: "POST",

        headers: {
            "Content-Type":
                "application/x-www-form-urlencoded"
        },

        body: new URLSearchParams({

            chat_id: chatId,

            text: message,

            parse_mode: "HTML"

        })

    });


    return await response.json();

}


async function sendTelegramPhoto(
    botToken,
    chatId,
    filePath,
    fileName,
    mimeType,
    caption
) {

    const formData = new FormData();

    formData.append(
        "chat_id",
        chatId
    );

    formData.append(
        "photo",
        fs.createReadStream(filePath),
        {
            filename: fileName,
            contentType: mimeType
        }
    );

    formData.append(
        "caption",
        caption
    );

    formData.append(
        "parse_mode",
        "HTML"
    );


    const url =
        `${TELEGRAM_API}/bot${botToken}/sendPhoto`;


    const response = await fetch(url, {

        method: "POST",

        headers: formData.getHeaders(),

        body: formData

    });


    return await response.json();

}


module.exports = async function handler(req, res) {

    try {

        /* =====================================================
           MÉTHODE
        ===================================================== */

        if (req.method !== "POST") {

            return jsonResponse(
                res,
                405,
                {
                    success: false,
                    message:
                        "Méthode non autorisée."
                }
            );

        }


        /* =====================================================
           VARIABLES TELEGRAM
        ===================================================== */

        const botToken =
            process.env.TELEGRAM_BOT_TOKEN;

        const chatId =
            process.env.TELEGRAM_CHAT_ID;


        if (!botToken || !chatId) {

            console.error(
                "Variables Telegram manquantes."
            );

            return jsonResponse(
                res,
                500,
                {
                    success: false,
                    message:
                        "Configuration Telegram manquante sur le serveur."
                }
            );

        }


        /* =====================================================
           RÉCUPÉRATION FORMULAIRE
        ===================================================== */

        const {
            fields,
            files
        } = await parseForm(req);


        /* =====================================================
           INFORMATIONS
        ===================================================== */

        const nom =
            getValue(fields.nom).trim();

        const prenom =
            getValue(fields.prenom).trim();

        const telephone =
            getValue(fields.telephone).trim();

        const email =
            getValue(fields.email).trim();

        const fonction =
            getValue(fields.fonction).trim();

        const ville =
            getValue(fields.ville).trim();

        const dateNaissance =
            getValue(fields.dateNaissance).trim();

        const situation =
            getValue(fields.situation).trim();

        const motivation =
            getValue(fields.motivation).trim();

        const conditions =
            getValue(fields.conditions);


        /* =====================================================
           VALIDATION
        ===================================================== */

        if (
            !nom ||
            !prenom ||
            !telephone ||
            !fonction ||
            !ville
        ) {

            return jsonResponse(
                res,
                400,
                {
                    success: false,
                    message:
                        "Veuillez remplir tous les champs obligatoires."
                }
            );

        }


        if (!conditions) {

            return jsonResponse(
                res,
                400,
                {
                    success: false,
                    message:
                        "Vous devez accepter les conditions d'adhésion."
                }
            );

        }


        /* =====================================================
           TÉLÉPHONE
        ===================================================== */

        const telephoneNettoye =
            telephone.replace(
                /[^0-9+ ()-]/g,
                ""
            );


        if (telephoneNettoye.length < 8) {

            return jsonResponse(
                res,
                400,
                {
                    success: false,
                    message:
                        "Numéro de téléphone invalide."
                }
            );

        }


        /* =====================================================
           EMAIL
        ===================================================== */

        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {

            return jsonResponse(
                res,
                400,
                {
                    success: false,
                    message:
                        "Adresse e-mail invalide."
                }
            );

        }


        /* =====================================================
           PHOTO
        ===================================================== */

        let photo = null;


        if (files.photo) {

            photo = Array.isArray(files.photo)
                ? files.photo[0]
                : files.photo;


            if (
                photo.size &&
                photo.size > MAX_FILE_SIZE
            ) {

                return jsonResponse(
                    res,
                    400,
                    {
                        success: false,
                        message:
                            "La photo ne doit pas dépasser 4 Mo."
                    }
                );

            }


            const mimeType =
                photo.mimetype || "";


            const allowedTypes = [
                "image/jpeg",
                "image/png"
            ];


            if (
                !allowedTypes.includes(
                    mimeType
                )
            ) {

                return jsonResponse(
                    res,
                    400,
                    {
                        success: false,
                        message:
                            "Format de photo non autorisé. Utilisez JPG, JPEG ou PNG."
                    }
                );

            }

        } else {

            return jsonResponse(
                res,
                400,
                {
                    success: false,
                    message:
                        "Veuillez ajouter votre photo."
                }
            );

        }


        /* =====================================================
           NUMÉRO D'ADHÉSION
        ===================================================== */

        const annee =
            new Date().getFullYear();


        const numeroAleatoire =
            Math.floor(
                1000 +
                Math.random() * 9000
            );


        const numeroAdhesion =
            `CECRM-${annee}-${numeroAleatoire}`;


        /* =====================================================
           DATE
        ===================================================== */

        const maintenant =
            new Date();


        const dateDemande =
            maintenant.toLocaleDateString(
                "fr-FR",
                {
                    timeZone:
                        "Africa/Casablanca"
                }
            );


        const heureDemande =
            maintenant.toLocaleTimeString(
                "fr-FR",
                {
                    timeZone:
                        "Africa/Casablanca",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );


        /* =====================================================
           MESSAGE TELEGRAM
        ===================================================== */

        const message = `

<b>🔔 NOUVELLE DEMANDE D'ADHÉSION</b>

━━━━━━━━━━━━━━━━━━━━

<b>👤 IDENTITÉ</b>

<b>Nom :</b> ${escapeTelegram(nom)}
<b>Prénom :</b> ${escapeTelegram(prenom)}

<b>📱 Téléphone :</b> ${escapeTelegram(telephone)}

<b>📧 Email :</b> ${escapeTelegram(
            email || "Non renseigné"
        )}

<b>🎂 Date de naissance :</b> ${escapeTelegram(
            dateNaissance || "Non renseignée"
        )}

━━━━━━━━━━━━━━━━━━━━

<b>💼 INFORMATIONS</b>

<b>Profession :</b> ${escapeTelegram(fonction)}

<b>📍 Ville :</b> ${escapeTelegram(ville)}

<b>📌 Situation :</b> ${escapeTelegram(
            situation || "Non renseignée"
        )}

━━━━━━━━━━━━━━━━━━━━

<b>📝 MOTIVATION</b>

${escapeTelegram(
    motivation || "Aucune motivation renseignée"
)}

━━━━━━━━━━━━━━━━━━━━

<b>🆔 Numéro de préinscription :</b>

<code>${numeroAdhesion}</code>

<b>📅 Date :</b> ${dateDemande}

<b>⏰ Heure :</b> ${heureDemande}

━━━━━━━━━━━━━━━━━━━━

<b>CECRM</b>

<i>Cercle d’Entraide des Congolais Résidents au Maroc</i>

`;


        /* =====================================================
           ENVOI MESSAGE
        ===================================================== */

        const messageResult =
            await sendTelegramMessage(
                botToken,
                chatId,
                message
            );


        if (
            !messageResult ||
            messageResult.ok !== true
        ) {

            console.error(
                "Telegram message error:",
                messageResult
            );

            return jsonResponse(
                res,
                500,
                {
                    success: false,
                    message:
                        "Impossible d'envoyer les informations à Telegram."
                }
            );

        }


        /* =====================================================
           ENVOI PHOTO
        ===================================================== */

        const photoCaption =

            `📸 <b>PHOTO DU NOUVEL ADHÉRENT</b>\n\n` +

            `👤 <b>${escapeTelegram(
                prenom
            )} ${escapeTelegram(
                nom
            )}</b>\n` +

            `🆔 <b>${numeroAdhesion}</b>\n` +

            `📱 ${escapeTelegram(
                telephone
            )}`;


        const photoResult =
            await sendTelegramPhoto(

                botToken,

                chatId,

                photo.filepath,

                photo.originalFilename ||
                    "photo-adherent",

                photo.mimetype ||
                    "image/jpeg",

                photoCaption

            );


        if (
            !photoResult ||
            photoResult.ok !== true
        ) {

            console.error(
                "Telegram photo error:",
                photoResult
            );

            return jsonResponse(
                res,
                500,
                {
                    success: false,
                    message:
                        "Les informations ont été envoyées, mais l'envoi de la photo a échoué."
                }
            );

        }


        /* =====================================================
           SUPPRESSION TEMPORAIRE
        ===================================================== */

        try {

            if (
                photo.filepath &&
                fs.existsSync(
                    photo.filepath
                )
            ) {

                fs.unlinkSync(
                    photo.filepath
                );

            }

        } catch (deleteError) {

            console.error(
                "Erreur suppression photo:",
                deleteError
            );

        }


        /* =====================================================
           RÉPONSE
        ===================================================== */

        return jsonResponse(
            res,
            200,
            {
                success: true,

                message:
                    "Votre demande d'adhésion a été envoyée avec succès.",

                numero:
                    numeroAdhesion
            }
        );


    } catch (error) {

        console.error(
            "Erreur CECRM:",
            error
        );


        return jsonResponse(
            res,
            500,
            {
                success: false,
                message:
                    "Une erreur interne est survenue. Veuillez réessayer."
            }
        );

    }

};