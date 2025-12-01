"""
Seed script to populate the database with 250 debate topics.

Topics are distributed across all subdomains with a normal distribution
from silly to serious (most topics are medium seriousness).

Usage:
    python scripts/seed_topics.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import async_session_maker
from app.models import Topic
from app.models.enums import TopicSource, TopicStatus
from app.taxonomy import Domain, Subdomain, TAXONOMY


# Topics organized by subdomain
# Each topic has a "seriousness" level: 1=silly, 2=light, 3=medium, 4=serious, 5=heavy
SEED_TOPICS = {
    # ============================================
    # SCIENCE & TECHNOLOGY
    # ============================================

    Subdomain.AI_COMPUTING: [
        # Silly (1)
        ("AI chatbots should be required to tell bad jokes on command", 1),
        ("Autocorrect has improved human communication more than the printing press", 1),
        ("Robot vacuums deserve workers' rights", 1),
        ("CAPTCHA tests are discrimination against robots", 1),
        # Light (2)
        ("Smart home devices are making us lazier, not smarter", 2),
        ("Coding bootcamps are more valuable than computer science degrees", 2),
        ("Video game AI is getting too good and ruining the fun", 2),
        # Medium (3)
        ("AI-generated art should be eligible for copyright protection", 3),
        ("Companies should be required to disclose when customers are talking to AI", 3),
        ("Programming should be taught as a mandatory subject in all schools", 3),
        ("Open source AI models are more dangerous than closed ones", 3),
        # Serious (4)
        ("AI systems should be legally required to be explainable", 4),
        ("Autonomous weapons should be banned by international treaty", 4),
        ("Tech companies should be liable for algorithmic discrimination", 4),
        # Heavy (5)
        ("Artificial general intelligence poses an existential risk to humanity", 5),
        ("AI development should be paused until safety is guaranteed", 5),
    ],

    Subdomain.ENVIRONMENT_CLIMATE: [
        # Silly (1)
        ("Lawns are the enemy of the environment and should be illegal", 1),
        ("Everyone should be required to adopt a houseplant", 1),
        # Light (2)
        ("Paper straws are worse than the problem they're trying to solve", 2),
        ("Electric cars are just coal-powered cars with extra steps", 2),
        ("Recycling is mostly a feel-good activity with little real impact", 2),
        # Medium (3)
        ("Carbon offsets are an effective tool for fighting climate change", 3),
        ("Nuclear power is essential for achieving net-zero emissions", 3),
        ("Corporations, not individuals, should bear responsibility for emissions", 3),
        ("Meat consumption should be taxed based on its carbon footprint", 3),
        # Serious (4)
        ("Developed nations owe climate reparations to developing countries", 4),
        ("Geoengineering should be pursued as a climate solution", 4),
        ("Economic growth must be sacrificed to address climate change", 4),
        # Heavy (5)
        ("Climate change will cause civilizational collapse within this century", 5),
        ("Having children is unethical given the climate crisis", 5),
    ],

    Subdomain.MEDICINE_HEALTH: [
        # Silly (1)
        ("Pineapple on pizza should be classified as a health food", 1),
        ("The snooze button does more harm than coffee does good", 1),
        # Light (2)
        ("Standing desks are overrated health theater", 2),
        ("Intermittent fasting is just skipping breakfast with extra steps", 2),
        ("WebMD has caused more anxiety than it has prevented illness", 2),
        # Medium (3)
        ("Pharmaceutical advertising should be banned", 3),
        ("Mental health days should be legally protected like sick days", 3),
        ("Universal healthcare produces better outcomes than private systems", 3),
        ("Doctors should be required to disclose their success rates", 3),
        # Serious (4)
        ("Vaccine mandates are justified for public health", 4),
        ("Physician-assisted suicide should be legal for terminal patients", 4),
        ("Healthcare rationing is inevitable and should be openly discussed", 4),
        # Heavy (5)
        ("Pandemics will become more frequent due to human activity", 5),
        ("Antibiotic resistance is a greater threat than climate change", 5),
    ],

    Subdomain.SPACE_EXPLORATION: [
        # Silly (1)
        ("The moon landing was real, but the footage was staged because the real footage was boring", 1),
        ("Mars colonies should have their own reality TV show from day one", 1),
        ("Pluto deserves to be a planet again", 1),
        # Light (2)
        ("Space tourism is just expensive bragging rights", 2),
        ("NASA should focus on ocean exploration instead of space", 2),
        # Medium (3)
        ("Space should remain free from national territorial claims", 3),
        ("Private companies are better suited for space exploration than governments", 3),
        ("Asteroid mining will solve Earth's resource problems", 3),
        # Serious (4)
        ("Colonizing Mars is humanity's best insurance policy against extinction", 4),
        ("Space debris is an urgent crisis requiring international action", 4),
        ("SETI funding is a worthwhile investment despite no results", 4),
        # Heavy (5)
        ("Humanity has a moral obligation to become a multi-planetary species", 5),
        ("Contact with alien intelligence would be catastrophic for humanity", 5),
    ],

    Subdomain.BIOTECHNOLOGY: [
        # Silly (1)
        ("Designer babies should be allowed to have naturally purple hair", 1),
        ("Genetically modified pets that glow in the dark should be legal", 1),
        # Light (2)
        ("GMO labeling is unnecessary fearmongering", 2),
        ("Lab-grown meat will never match the real thing", 2),
        # Medium (3)
        ("Gene editing for disease prevention should be widely available", 3),
        ("Genetic testing results should be protected from insurance companies", 3),
        ("Cloning pets is ethically acceptable", 3),
        # Serious (4)
        ("Germline genetic editing should be banned internationally", 4),
        ("De-extinction of species is worth pursuing", 4),
        ("Bioweapons research should continue for defensive purposes", 4),
        # Heavy (5)
        ("Genetic enhancement will create a new form of inequality", 5),
        ("Humanity should use biotechnology to direct its own evolution", 5),
    ],

    Subdomain.ENERGY_RESOURCES: [
        # Silly (1)
        ("Hamster wheels should be connected to the power grid", 1),
        # Light (2)
        ("Daylight saving time wastes more energy than it saves", 2),
        ("Crypto mining is an unacceptable waste of energy", 2),
        # Medium (3)
        ("Fracking should be banned entirely", 3),
        ("All new buildings should be required to have solar panels", 3),
        ("Nuclear waste storage problems are solvable", 3),
        ("Energy independence should be a national security priority", 3),
        # Serious (4)
        ("The world will never fully transition away from fossil fuels", 4),
        ("Developing nations should be exempt from emission restrictions", 4),
        # Heavy (5)
        ("Energy scarcity will be the primary cause of future wars", 5),
        ("Fusion power will arrive too late to matter", 5),
    ],

    # ============================================
    # SOCIETY & CULTURE
    # ============================================

    Subdomain.EDUCATION: [
        # Silly (1)
        ("Nap time should be mandatory through college", 1),
        ("Cursive handwriting should be removed from all curricula forever", 1),
        ("Students should grade their teachers", 1),
        # Light (2)
        ("Homework does more harm than good", 2),
        ("Summer vacation is too long and causes learning loss", 2),
        ("College rankings do more harm than good", 2),
        # Medium (3)
        ("Standardized testing is an effective measure of student ability", 3),
        ("Trade schools should be promoted equally to universities", 3),
        ("Student loan forgiveness is good policy", 3),
        ("Schools should teach financial literacy as a core subject", 3),
        # Serious (4)
        ("Affirmative action in college admissions creates fairer outcomes", 4),
        ("Teacher tenure protects mediocrity more than it protects good teachers", 4),
        ("Higher education is overvalued in modern society", 4),
        # Heavy (5)
        ("The education system primarily serves to maintain social hierarchies", 5),
    ],

    Subdomain.MEDIA_ENTERTAINMENT: [
        # Silly (1)
        ("Movie theaters should allow talking during films", 1),
        ("Laugh tracks make sitcoms funnier", 1),
        ("Spoilers should be a criminal offense", 1),
        ("Sequels are always worse than originals", 1),
        # Light (2)
        ("Binge-watching is ruining the art of television", 2),
        ("Social media influencers provide genuine value to society", 2),
        ("Remakes and reboots indicate creative bankruptcy", 2),
        # Medium (3)
        ("Social media companies should be treated as publishers", 3),
        ("News organizations should be required to separate news from opinion", 3),
        ("Video games are art worthy of the same respect as film and literature", 3),
        # Serious (4)
        ("Social media algorithms are undermining democracy", 4),
        ("Misinformation laws would do more harm than good", 4),
        ("The 24-hour news cycle has damaged public discourse", 4),
        # Heavy (5)
        ("Social media is causing a mental health crisis in young people", 5),
    ],

    Subdomain.SPORTS_COMPETITION: [
        # Silly (1)
        ("Golf is not a real sport", 1),
        ("Cheerleading is more athletic than most sports it supports", 1),
        ("Hot dogs are sandwiches and Nathan's is athletic competition", 1),
        # Light (2)
        ("Esports deserve the same recognition as traditional sports", 2),
        ("The Olympics have become too commercialized", 2),
        ("Youth sports have become too competitive", 2),
        # Medium (3)
        ("College athletes should be paid market salaries", 3),
        ("Performance-enhancing drugs should be allowed in a separate league", 3),
        ("Transgender athletes should compete in their identified gender category", 3),
        # Serious (4)
        ("Sports betting legalization has been harmful to society", 4),
        ("Hosting the Olympics is a net negative for cities", 4),
        ("Contact sports like football should be banned for minors due to brain injury risk", 4),
        # Heavy (5)
        ("Professional sports perpetuate harmful masculine ideals", 5),
    ],

    Subdomain.FAMILY_RELATIONSHIPS: [
        # Silly (1)
        ("The toilet seat should always be left down", 1),
        ("Couples who share social media passwords have trust issues", 1),
        # Light (2)
        ("Living together before marriage reduces divorce rates", 2),
        ("Parents should be friends with their children on social media", 2),
        ("Arranged marriages can be just as successful as love marriages", 2),
        # Medium (3)
        ("Helicopter parenting does more harm than good", 3),
        ("Marriage as an institution is outdated", 3),
        ("Children should not be on social media until age 16", 3),
        # Serious (4)
        ("Same-sex couples are equally capable parents as heterosexual couples", 4),
        ("The nuclear family model is being unfairly idealized", 4),
        ("Divorce should be harder to obtain when children are involved", 4),
        # Heavy (5)
        ("Having children is a selfish act in the modern world", 5),
    ],

    Subdomain.RELIGION_SPIRITUALITY: [
        # Silly (1)
        ("Astrology is just as valid as any organized religion", 1),
        ("The Flying Spaghetti Monster deserves tax-exempt status", 1),
        # Light (2)
        ("Megachurches have strayed from religious principles", 2),
        ("Mindfulness apps have commercialized spirituality", 2),
        # Medium (3)
        ("Religious organizations should pay taxes", 3),
        ("Public schools should teach comparative religion", 3),
        ("Science and religion are fundamentally compatible", 3),
        # Serious (4)
        ("Religious exemptions to laws should be limited", 4),
        ("Secularism is necessary for a pluralistic society", 4),
        ("Religious belief is declining and that's a good thing", 4),
        # Heavy (5)
        ("Religion has caused more harm than good throughout history", 5),
        ("Humanity would be better off without organized religion", 5),
    ],

    Subdomain.DEMOGRAPHICS_MIGRATION: [
        # Silly (1)
        ("Florida should be its own country", 1),
        # Light (2)
        ("Small towns are dying and that's actually okay", 2),
        ("Aging populations are a bigger problem than overpopulation", 2),
        # Medium (3)
        ("Immigration strengthens rather than threatens national culture", 3),
        ("Birthright citizenship should be reconsidered", 3),
        ("Countries should prioritize skilled immigrant admissions", 3),
        ("Refugees should be distributed proportionally among wealthy nations", 3),
        # Serious (4)
        ("Open borders would benefit the global economy", 4),
        ("Demographic decline will be the defining crisis of the 21st century", 4),
        ("Assimilation should be expected of immigrants", 4),
        # Heavy (5)
        ("Mass migration will destabilize developed nations", 5),
    ],

    Subdomain.URBAN_RURAL: [
        # Silly (1)
        ("Suburbs are the worst of both worlds", 1),
        ("Jaywalking should be legal everywhere", 1),
        # Light (2)
        ("Work from home will kill city centers", 2),
        ("Public transit is superior to car ownership", 2),
        ("NIMBYism is destroying housing affordability", 2),
        # Medium (3)
        ("Cities should ban cars from downtown areas", 3),
        ("Rent control policies do more harm than good", 3),
        ("Zoning laws are the root cause of housing crises", 3),
        # Serious (4)
        ("Gentrification does more harm than good to existing communities", 4),
        ("Rural areas are being unfairly neglected by policymakers", 4),
        ("The urban-rural political divide is the most important in modern society", 4),
        # Heavy (5)
        ("Megacities are unsustainable and will collapse", 5),
    ],

    # ============================================
    # POLITICS & GOVERNANCE
    # ============================================

    Subdomain.DEMOCRACY_VOTING: [
        # Silly (1)
        ("Voting booths should have snacks", 1),
        ("Political debates should include a talent portion", 1),
        # Light (2)
        ("Mandatory voting would improve democracy", 2),
        ("The electoral college is an outdated system", 2),
        ("Politicians should be subject to term limits", 2),
        # Medium (3)
        ("Voting age should be lowered to 16", 3),
        ("Ranked-choice voting produces better outcomes", 3),
        ("Corporate political donations should be banned", 3),
        ("Social media companies should not moderate political content", 3),
        # Serious (4)
        ("Direct democracy is superior to representative democracy", 4),
        ("Democracy is not the best system for all countries", 4),
        ("Voter ID laws are a form of voter suppression", 4),
        # Heavy (5)
        ("Democracy is in global decline and may not recover", 5),
        ("Most voters are too uninformed to make good decisions", 5),
    ],

    Subdomain.INTERNATIONAL_RELATIONS: [
        # Silly (1)
        ("The UN should relocate to Antarctica", 1),
        # Light (2)
        ("The United Nations is ineffective at preventing conflict", 2),
        ("Foreign aid often does more harm than good", 2),
        # Medium (3)
        ("Economic sanctions are an effective foreign policy tool", 3),
        ("NATO expansion has contributed to global instability", 3),
        ("Countries should prioritize national interests over international cooperation", 3),
        ("The US should reduce its military presence abroad", 3),
        # Serious (4)
        ("A new Cold War between the US and China is inevitable", 4),
        ("International institutions need fundamental reform to remain relevant", 4),
        ("Humanitarian intervention is justified even without UN approval", 4),
        # Heavy (5)
        ("The international rules-based order is collapsing", 5),
        ("Great power conflict in the 21st century is inevitable", 5),
    ],

    Subdomain.LAW_JUSTICE: [
        # Silly (1)
        ("Jury duty should pay better than most jobs", 1),
        ("Lawyers should wear costumes instead of suits", 1),
        # Light (2)
        ("The insanity defense is too easily abused", 2),
        ("Jaywalking should be decriminalized everywhere", 2),
        # Medium (3)
        ("The death penalty should be abolished", 3),
        ("Drug possession should be decriminalized", 3),
        ("Prisons should focus on rehabilitation over punishment", 3),
        ("Qualified immunity for police should be eliminated", 3),
        # Serious (4)
        ("The American criminal justice system is fundamentally racist", 4),
        ("Life sentences without parole are inhumane", 4),
        ("Plea bargaining undermines justice", 4),
        # Heavy (5)
        ("Mass incarceration is a form of modern slavery", 5),
        ("The justice system cannot be reformed, only replaced", 5),
    ],

    Subdomain.CIVIL_RIGHTS: [
        # Silly (1)
        ("The right to nap should be constitutionally protected", 1),
        # Light (2)
        ("Hate speech should be protected as free speech", 2),
        ("Privacy is dead and we should accept it", 2),
        # Medium (3)
        ("Government surveillance is necessary for national security", 3),
        ("Free speech should have limits on social media platforms", 3),
        ("Affirmative action is still necessary to address inequality", 3),
        ("Reparations for slavery are justified", 3),
        # Serious (4)
        ("Privacy is more important than security", 4),
        ("Cancel culture is a threat to free expression", 4),
        ("Systemic racism exists in all major institutions", 4),
        # Heavy (5)
        ("Civil liberties must sometimes be sacrificed during crises", 5),
        ("True equality is impossible to achieve", 5),
    ],

    Subdomain.MILITARY_DEFENSE: [
        # Silly (1)
        ("Military uniforms should be more fashionable", 1),
        # Light (2)
        ("The military-industrial complex drives unnecessary conflict", 2),
        ("Mandatory military service builds character", 2),
        # Medium (3)
        ("Defense spending should be significantly reduced", 3),
        ("Drone warfare is more ethical than traditional combat", 3),
        ("Nuclear weapons have prevented major wars", 3),
        # Serious (4)
        ("Conscription is justified in times of existential threat", 4),
        ("Torture is never justified, even for national security", 4),
        ("Private military contractors should be banned", 4),
        # Heavy (5)
        ("Nuclear disarmament is a naive fantasy", 5),
        ("War is an inevitable part of human nature", 5),
    ],

    Subdomain.PUBLIC_POLICY: [
        # Silly (1)
        ("Government forms should be limited to one page", 1),
        # Light (2)
        ("Sin taxes on unhealthy products are justified", 2),
        ("Daylight saving time should be abolished", 2),
        # Medium (3)
        ("Universal basic income would be better than current welfare systems", 3),
        ("Government should not subsidize any private industry", 3),
        ("Occupational licensing has gone too far", 3),
        ("Carbon taxes are the most effective climate policy", 3),
        # Serious (4)
        ("The administrative state has become too powerful", 4),
        ("Means-testing for social programs does more harm than good", 4),
        ("Government cannot solve most social problems", 4),
        # Heavy (5)
        ("Modern governments are structurally incapable of addressing long-term problems", 5),
    ],

    # ============================================
    # ECONOMICS & BUSINESS
    # ============================================

    Subdomain.MARKETS_TRADE: [
        # Silly (1)
        ("Black Friday should be an international holiday", 1),
        ("Haggling should be acceptable at all stores", 1),
        # Light (2)
        ("Free trade has hurt American workers more than helped consumers", 2),
        ("Tariffs are sometimes necessary to protect domestic industries", 2),
        # Medium (3)
        ("Globalization has been net positive for the world", 3),
        ("All monopolies should be broken up", 3),
        ("Capitalism requires constant growth and that's unsustainable", 3),
        # Serious (4)
        ("Free markets are more efficient than planned economies", 4),
        ("Shareholder primacy is destroying companies and society", 4),
        ("Economic decoupling from China is necessary", 4),
        # Heavy (5)
        ("Capitalism is fundamentally incompatible with environmental sustainability", 5),
    ],

    Subdomain.LABOR_WORK: [
        # Silly (1)
        ("Monday should be part of the weekend", 1),
        ("Reply-all should be a fireable offense", 1),
        ("Open office plans were invented by people who hate workers", 1),
        # Light (2)
        ("The four-day work week should be standard", 2),
        ("Remote work is superior to office work", 2),
        ("Tipping culture should be abolished", 2),
        # Medium (3)
        ("Minimum wage should be a living wage", 3),
        ("Unions are still necessary in the modern economy", 3),
        ("Gig economy workers deserve employee benefits", 3),
        # Serious (4)
        ("Automation will eliminate more jobs than it creates", 4),
        ("Right-to-work laws weaken worker protections", 4),
        ("Unpaid internships should be illegal", 4),
        # Heavy (5)
        ("Work as we know it will become obsolete within 50 years", 5),
    ],

    Subdomain.FINANCE_WEALTH: [
        # Silly (1)
        ("Pennies should be abolished", 1),
        ("People who don't check their bank balance are happier", 1),
        # Light (2)
        ("Cryptocurrency will never replace traditional currency", 2),
        ("Financial literacy should be taught starting in elementary school", 2),
        ("Banks should not charge overdraft fees", 2),
        # Medium (3)
        ("Billionaires should not exist", 3),
        ("A wealth tax is constitutional and effective", 3),
        ("Central bank digital currencies threaten financial privacy", 3),
        # Serious (4)
        ("The stock market no longer reflects the real economy", 4),
        ("Too-big-to-fail banks should be broken up", 4),
        ("Modern monetary theory is dangerous nonsense", 4),
        # Heavy (5)
        ("The global financial system is headed for collapse", 5),
    ],

    Subdomain.ENTREPRENEURSHIP: [
        # Silly (1)
        ("Every startup should be required to have a nap room", 1),
        ("'Disruption' is just a fancy word for being annoying", 1),
        # Light (2)
        ("Silicon Valley culture has become toxic", 2),
        ("Most venture-backed startups are bad for society", 2),
        ("Hustle culture is unhealthy and unsustainable", 2),
        # Medium (3)
        ("Big tech companies should be broken up", 3),
        ("Startup culture overvalues growth at the expense of sustainability", 3),
        ("Small businesses should receive more government support than large corporations", 3),
        # Serious (4)
        ("Entrepreneurship is not a viable path for most people", 4),
        ("Tech founders have too much unchecked power", 4),
        # Heavy (5)
        ("The era of transformative tech innovation is over", 5),
    ],

    Subdomain.CONSUMER_ECONOMICS: [
        # Silly (1)
        ("Extended warranties are always a scam", 1),
        ("The customer is rarely actually right", 1),
        # Light (2)
        ("Subscription models have gone too far", 2),
        ("Planned obsolescence should be illegal", 2),
        ("Advertising to children should be banned", 2),
        # Medium (3)
        ("Consumer protection laws need to be strengthened", 3),
        ("Companies that profit from addiction should be regulated like tobacco", 3),
        ("Right to repair laws are necessary and overdue", 3),
        # Serious (4)
        ("Consumer culture is fundamentally unsatisfying", 4),
        ("Privacy should not be a luxury good", 4),
        # Heavy (5)
        ("Consumerism is the root cause of environmental destruction", 5),
    ],

    Subdomain.INEQUALITY: [
        # Silly (1)
        ("Billionaires should have to wear a special hat", 1),
        # Light (2)
        ("Lottery winners would be better off never playing", 2),
        ("Inheritance over a certain amount should be heavily taxed", 2),
        # Medium (3)
        ("Income inequality has reached dangerous levels", 3),
        ("Universal basic income would reduce inequality", 3),
        ("Meritocracy is largely a myth", 3),
        # Serious (4)
        ("Extreme wealth is inherently immoral", 4),
        ("Poverty in wealthy nations is a policy choice", 4),
        ("Economic mobility has significantly declined", 4),
        # Heavy (5)
        ("Inequality will lead to social collapse without intervention", 5),
        ("Capitalism necessarily produces unacceptable inequality", 5),
    ],

    # ============================================
    # PHILOSOPHY & ETHICS
    # ============================================

    Subdomain.MORALITY_VALUES: [
        # Silly (1)
        ("It's morally wrong to not return shopping carts", 1),
        ("Lying about liking someone's cooking is virtuous", 1),
        # Light (2)
        ("White lies are sometimes necessary for social harmony", 2),
        ("Ghosting someone is always morally wrong", 2),
        # Medium (3)
        ("Moral relativism leads to ethical paralysis", 3),
        ("Intentions matter more than outcomes in judging actions", 3),
        ("There are universal moral truths that transcend culture", 3),
        # Serious (4)
        ("Humans are fundamentally selfish beings", 4),
        ("Moral progress is real and measurable", 4),
        ("Consequentialism is the most defensible ethical framework", 4),
        # Heavy (5)
        ("Objective morality does not exist", 5),
        ("Humanity is not morally progressing, just changing", 5),
    ],

    Subdomain.CONSCIOUSNESS_MIND: [
        # Silly (1)
        ("Déjà vu is evidence of a glitch in the simulation", 1),
        ("Dreams are more real than waking life", 1),
        # Light (2)
        ("We are all living in a computer simulation", 2),
        ("Multitasking is a myth—the brain can only focus on one thing", 2),
        # Medium (3)
        ("Free will is an illusion", 3),
        ("Animals are conscious in the same way humans are", 3),
        ("AI could become genuinely conscious", 3),
        ("Personal identity persists over time", 3),
        # Serious (4)
        ("The hard problem of consciousness will never be solved", 4),
        ("Mind uploading would not preserve personal identity", 4),
        # Heavy (5)
        ("Consciousness is the only thing we can be certain exists", 5),
        ("We cannot truly know if other minds exist", 5),
    ],

    Subdomain.EXISTENCE_MEANING: [
        # Silly (1)
        ("The meaning of life is to find good tacos", 1),
        # Light (2)
        ("Life has no inherent meaning and that's liberating", 2),
        ("Fear of death is irrational", 2),
        # Medium (3)
        ("Life without adversity would be meaningless", 3),
        ("Immortality would be a curse, not a blessing", 3),
        ("Humans need religion to find meaning", 3),
        ("The search for meaning is itself the meaning", 3),
        # Serious (4)
        ("Life's meaning must be created, not discovered", 4),
        ("Nihilism is intellectually inescapable but practically unlivable", 4),
        # Heavy (5)
        ("Human existence may be cosmically insignificant", 5),
        ("Death gives life meaning", 5),
    ],

    Subdomain.APPLIED_ETHICS: [
        # Silly (1)
        ("It's ethical to steal from all-you-can-eat buffets", 1),
        # Light (2)
        ("It's okay to lie on your resume about soft skills", 2),
        ("Ghostwriting is a form of intellectual dishonesty", 2),
        # Medium (3)
        ("Euthanasia should be legal for anyone who requests it", 3),
        ("Eating meat is morally indefensible", 3),
        ("Abortion is a matter of bodily autonomy, not philosophy", 3),
        ("Zoos are unethical regardless of conservation benefits", 3),
        # Serious (4)
        ("It's ethical to break unjust laws", 4),
        ("Self-driving cars should prioritize passengers over pedestrians", 4),
        ("Human experimentation is sometimes justified for medical progress", 4),
        # Heavy (5)
        ("Humanity has a moral obligation to reduce its own suffering even if it means extinction", 5),
    ],

    Subdomain.EPISTEMOLOGY: [
        # Silly (1)
        ("Knowing you know nothing is still knowing something", 1),
        # Light (2)
        ("Intuition is an undervalued form of knowledge", 2),
        ("Expertise is overrated in the age of information", 2),
        # Medium (3)
        ("Scientific consensus should be trusted by default", 3),
        ("Personal experience is a valid form of evidence", 3),
        ("Truth exists independently of human perception", 3),
        # Serious (4)
        ("Complete objectivity is impossible for humans", 4),
        ("Faith and reason are fundamentally incompatible", 4),
        ("Post-truth society is a real and dangerous phenomenon", 4),
        # Heavy (5)
        ("Absolute truth is unknowable", 5),
        ("Reality is socially constructed", 5),
    ],

    Subdomain.LOGIC_REASONING: [
        # Silly (1)
        ("This statement is false (and that's okay)", 1),
        # Light (2)
        ("Common sense is neither common nor sensible", 2),
        ("Most debates are won through rhetoric, not logic", 2),
        # Medium (3)
        ("Emotional arguments have a legitimate place in debate", 3),
        ("Logic alone cannot determine what is right", 3),
        ("Critical thinking should be a core school subject", 3),
        # Serious (4)
        ("Human reasoning is fundamentally flawed", 4),
        ("Pure rationality is an unattainable ideal", 4),
        # Heavy (5)
        ("Reason has limits that cannot be transcended", 5),
    ],

    # ============================================
    # ARTS & HUMANITIES
    # ============================================

    Subdomain.LITERATURE_LANGUAGE: [
        # Silly (1)
        ("The Oxford comma is worth fighting for", 1),
        ("Audiobooks count as reading", 1),
        ("Emojis are a legitimate form of language", 1),
        # Light (2)
        ("Classic literature is overrated and boring", 2),
        ("Everyone should be bilingual", 2),
        ("Speed reading destroys comprehension", 2),
        # Medium (3)
        ("Ebooks will eventually replace physical books", 3),
        ("Fiction is more truthful than nonfiction", 3),
        ("Slang enriches rather than degrades language", 3),
        # Serious (4)
        ("Language shapes thought in fundamental ways", 4),
        ("The death of languages represents a loss for humanity", 4),
        # Heavy (5)
        ("Literature is the most important art form for understanding humanity", 5),
    ],

    Subdomain.VISUAL_PERFORMING_ARTS: [
        # Silly (1)
        ("Modern art is just money laundering with extra steps", 1),
        ("Singing in the shower should be considered practice", 1),
        # Light (2)
        ("Digital art is just as valid as traditional art", 2),
        ("Pop music is unfairly dismissed by critics", 2),
        ("Museums should be free for everyone", 2),
        # Medium (3)
        ("AI-generated art threatens human creativity", 3),
        ("Art should be provocative, not just beautiful", 3),
        ("Public funding for the arts is essential", 3),
        # Serious (4)
        ("Art for art's sake is a valid pursuit", 4),
        ("The commodification of art has corrupted its purpose", 4),
        # Heavy (5)
        ("Great art requires suffering", 5),
    ],

    Subdomain.HISTORY_MEMORY: [
        # Silly (1)
        ("Pirates were just misunderstood entrepreneurs", 1),
        ("History is written by whoever has the best PR team", 1),
        # Light (2)
        ("Confederate monuments should be removed from public spaces", 2),
        ("History education is too focused on memorizing dates", 2),
        # Medium (3)
        ("Countries should formally apologize for historical atrocities", 3),
        ("History tends to repeat itself", 3),
        ("Nationalism requires selective historical memory", 3),
        # Serious (4)
        ("We cannot judge historical figures by modern standards", 4),
        ("Historical trauma affects generations", 4),
        ("History is more about power than truth", 4),
        # Heavy (5)
        ("Humanity learns nothing from history", 5),
    ],

    Subdomain.CULTURAL_IDENTITY: [
        # Silly (1)
        ("Cultural appropriation includes pineapple on pizza", 1),
        # Light (2)
        ("Cultural appropriation is usually harmless appreciation", 2),
        ("Globalization is erasing cultural diversity", 2),
        # Medium (3)
        ("Preserving dying cultures is a moral imperative", 3),
        ("National identity is largely a modern invention", 3),
        ("Multiculturalism enriches societies", 3),
        # Serious (4)
        ("Cultural relativism has limits when it comes to human rights", 4),
        ("Indigenous rights should take precedence over national development", 4),
        ("Cultural identity can be both a source of strength and division", 4),
        # Heavy (5)
        ("The concept of race has no scientific basis but profound social consequences", 5),
    ],

    Subdomain.ARCHITECTURE_DESIGN: [
        # Silly (1)
        ("Brutalist architecture is beautiful and we should build more", 1),
        ("Every building should have a rooftop garden", 1),
        # Light (2)
        ("Modern architecture has sacrificed beauty for function", 2),
        ("Tiny houses are a solution to the housing crisis", 2),
        # Medium (3)
        ("Cities should mandate green building standards", 3),
        ("Preserving historical buildings is worth the economic cost", 3),
        ("Good design can solve social problems", 3),
        # Serious (4)
        ("Architecture reflects and reinforces social hierarchies", 4),
        ("Suburban sprawl is an environmental disaster", 4),
        # Heavy (5)
        ("The built environment fundamentally shapes human behavior", 5),
    ],
}


def get_topics_with_metadata():
    """
    Generate all topics with proper metadata.
    Returns list of dicts ready for database insertion.
    """
    topics = []

    for subdomain, topic_list in SEED_TOPICS.items():
        subdomain_info = TAXONOMY[subdomain]
        domain = subdomain_info.domain

        for title, seriousness in topic_list:
            topics.append({
                "title": title,
                "subdomain": subdomain.value,
                "domain": domain.value,
                "category": domain.value,  # Legacy field
                "source": TopicSource.SEED,
                "status": TopicStatus.PENDING,
                "seriousness": seriousness,  # For distribution analysis
            })

    return topics


async def seed_topics():
    """Seed the database with topics."""
    topics_data = get_topics_with_metadata()

    print(f"Seeding {len(topics_data)} topics...")

    # Analyze distribution
    seriousness_counts = {}
    subdomain_counts = {}
    domain_counts = {}

    for t in topics_data:
        s = t["seriousness"]
        seriousness_counts[s] = seriousness_counts.get(s, 0) + 1
        subdomain_counts[t["subdomain"]] = subdomain_counts.get(t["subdomain"], 0) + 1
        domain_counts[t["domain"]] = domain_counts.get(t["domain"], 0) + 1

    print("\nSeriousness distribution:")
    for level in sorted(seriousness_counts.keys()):
        label = {1: "Silly", 2: "Light", 3: "Medium", 4: "Serious", 5: "Heavy"}[level]
        count = seriousness_counts[level]
        print(f"  {label} ({level}): {count} ({count/len(topics_data)*100:.1f}%)")

    print("\nDomain distribution:")
    for domain, count in sorted(domain_counts.items()):
        print(f"  {domain}: {count}")

    print("\nSubdomain distribution:")
    for subdomain, count in sorted(subdomain_counts.items()):
        print(f"  {subdomain}: {count}")

    # Insert into database
    async with async_session_maker() as session:
        for topic_data in topics_data:
            # Remove seriousness before inserting (not a DB field)
            topic_data.pop("seriousness", None)
            topic = Topic(**topic_data)
            session.add(topic)

        await session.commit()
        print(f"\nSuccessfully seeded {len(topics_data)} topics!")


if __name__ == "__main__":
    asyncio.run(seed_topics())
