I need help scaffolding a modern node backend application, I want it to be typescript but it needs to have js interoperability. It is an express backend, and should have standard stuff in there like cors, helmet, etc. I want it to have feature based folders not layer based -- its fine for all the files for a feature to live in the same folder. The concerns must be decoupled such that everything can be independently tested. It should generate swagger endpoints. The purpose of this is to act purely as a restful api. The project will serve two purposes, supporting api calls coming from our UI, those requests will come in from SSO (its saml and handled upstream) and will have an identityid field that will tell me who the person is. It also must serve endpoints for external applications using a revocable api key. We use Winston for logging. We do local dev and environment vars will be in .env. When we deploy to tanzu, we will pull down those values from a secure key store. Do not generate code yet, what questions do you have for me.

I would like to have a strongly typed repo that aligns to our oracle tables, so we can do stuff like user repository.findById(1234). is it possible to do a common/base layer that works on all tables? how would that work if each table had different column names?

don't worry about setting up oracledb package yet, i'll do that after everything else works. i'd like to generate swagger data from decorators in the source. 

lets use joi for endpoint validation. id like to be able to use strongly typed validation that aligns to our models in our endpoint validation.

our devs do local development and environment variables can be in .env which is not added to source control. once we deploy to tas we will pull secrets down from our secret store (i'll set that up)

lets use esbuild over tsc and ensure its set up for hot reload

if you are aware of the standard tanzu endpoints required for health monitoring feel free to set those up

lets go with vitest and please create a couple sample tests.

no need for docker support

please try to suggeast modern npm packages, historically you have suggested some that are years old. 

what questions do you have for me?