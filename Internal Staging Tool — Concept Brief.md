**Internal Staging Tool — Concept Brief**  
**Product Name: GreenShoe**

---

What it does: Creates a private copy of a client's live website. Team edits the copy. When ready, the copy replaces the live site.

Why we're building it: We don't edit live sites. We duplicate, test changes safely, then publish. This tool centralises that workflow.

How it works:

1. Select client site from dashboard  
2. System pulls full copy (files, database, images) to our staging server  
3. Team makes edits on staging version  
4. When approved, system pushes staging to live  
5. Old staging is archived

Supported platforms (Phase 1):

* WordPress  
* Static HTML sites

What we need from clients:

* Server credentials (FTP/SFTP or SSH)  
* Database credentials (WordPress only)

What we provide:

* Staging server infrastructure  
* Admin dashboard to manage all client staging sites

Team roles:

* Developers edit staging sites  
* Project managers approve and trigger push to live

**Spec: Internal Staging Tool**

---

**Purpose:** Duplicate client sites to staging environment, edit, push changes to live.

**Platforms (Phase 1):**

* WordPress  
* Static HTML

**Core Features:**

1. **Pull:** Clone live site to staging (files, database, assets)  
2. **Edit:** Make changes on staging environment  
3. **Push:** Deploy staging to live, overwrite live site  
4. **History:** Keep record of previous deployments

**Technical Requirements:**

* Server access to client sites (FTP/SFTP or SSH)  
* Database access for WordPress (MySQL credentials)  
* Hosting for staging environments (your infrastructure)  
* URL rewriting (staging URLs must work without breaking links)

**Build vs Buy Components:**

| Component | Build | Buy/Use |
| ----- | ----- | ----- |
| Site cloning engine | Build | — |
| Staging hosting | — | Your own VPS or cloud |
| Database cloning | Build | — |
| File sync | Build or use rsync | — |
| Admin dashboard | Build | — |

I want to create a bussiness the can duplicate exactly a website.  
And then edit updates of that websites   
Can you ask me clarifying questions first before we create a bussiness brief or spec doc for this please  
9:20 PM  
Formulated strategic questions to validate website duplication business concept.

1.   
2.   
3.   
4.   
5.   
6. 

Clarifying questions:

1. Who is the customer? Agencies managing client sites, business owners wanting backups, or something else?  
2. What does "duplicate" mean to you? Visual clone, full code copy, content scrape, or functional replica with database?  
3. Are users duplicating sites they own, or third-party sites? This determines legality and technical scope.  
4. What problem does this solve that existing tools like HTTrack, wget, or website builders with import features do not?  
5. "Edit updates" — do you mean the user edits the duplicate, or they want to sync ongoing changes from the original source?  
6. What platforms are you targeting? WordPress sites, custom builds, Shopify, all of the above?  
7. Do you have technical skills to build this, or are you the business/idea person looking to hire developers?  
8. What's your revenue model? SaaS subscription, one-time fee, per-site pricing?

Answer these. Then we build the spec.

1. We are an agency and we manage client sites, we rely on outsoruces to help us and we want to bring this inhouse to manage the sites and clients better.  
2. Visual clone, full code copy, content scrape, or functional replica with database, all of it  
3. sites they own  
4. Cost and learning of each builder software takes time.  
5. We edit the dupilcate and ongoing changes from original source  
6. All  
7. Yes, money and time we have. Irrelvant questions  
8. per site pricing.

Show more  
9:38 PM  
Identified conflicting requirements and scoped technical complexity.

1.   
2.   
3.   
4.   
5.   
6.   
7.   
8.   
1.   
2.   
3.   
4. 

Problems with your answers:  
Answer 5 is contradictory. You edit the duplicate. Then you want to sync changes from the original. What happens when both have changed? You have a merge conflict problem. Pick one:

* A: One-way sync (original pushes to duplicate, your edits get overwritten)  
* B: Fork model (you duplicate once, then it's yours, no sync)  
* C: Two-way sync (complex, expensive to build, merge conflicts guaranteed)

Which is it?  
Answer 1 vs 8 conflict. You said this is an internal agency tool. Then you said per-site pricing. Are you:

* A: Building for internal use only  
* B: Building to sell as a SaaS product  
* C: Both

Answer 6 is scope suicide. "All platforms" means WordPress, Shopify, Wix, Squarespace, Webflow, custom React, custom PHP, Laravel, Django, static HTML, headless CMS setups. Each has different architecture. Do you want to:

* A: Start with one platform and expand  
* B: Build a universal tool from day one

Answer these three. Your spec depends on it.  
Building for internal use only  
Start with couple of platforms and expand React and HTML. What are the most common  
9:40 PM  
Identified internal-use scope and synthesized platform recommendations.

1.   
2. 

You still dodged the sync question. Answer it:

* A: One-way sync (original overwrites your edits)  
* B: Fork model (duplicate once, no sync)  
* C: Two-way sync (merge conflicts)

Most common platforms by agency client volume:

1. WordPress — dominates. \~40% of all websites.  
2. Shopify — if you handle e-commerce clients.  
3. Webflow — growing fast in agency space.  
4. Static HTML/CSS — legacy clients, simple sites.  
5. React/Next.js — custom builds, higher-end clients.

My recommendation: Start with WordPress and Static HTML. Covers 60-70% of typical agency workload. React is complex to clone properly due to build processes, state management, API dependencies.  
Do you have WordPress clients? If yes, start there. If no, what does your current client portfolio look like by platform?  
I don't understand this questions, explain it to me more simply.  
You still dodged the sync question. Answer it:  
\* A: One-way sync (original overwrites your edits)  
\* B: Fork model (duplicate once, no sync)  
\* C: Two-way sync (merge conflicts)  
Start with WordPress and Static HTML  
9:42 PM  
Devised concrete example to demystify sync options.  
Simple example:  
You duplicate ClientSite.com on Monday. Now you have two copies: Original and Duplicate.  
Scenario: On Wednesday, the client updates their logo on the Original. On Thursday, you change the homepage text on the Duplicate.  
What happens next?  
Option A — One-way sync: Original always wins. The new logo appears on your Duplicate. Your text change gets deleted. You lose your work.  
Option B — Fork: No connection after duplication. Your text change stays. The new logo never appears. You manually copy changes if needed.  
Option C — Two-way sync: System tries to keep both changes. Logo comes over. Text stays. But what if you both edited the same paragraph? System breaks or needs manual resolution. Complex to build.  
Question for you: When you duplicate a client site, do you need it to stay connected to the original and receive updates? Or do you copy it once and work independently from that point?  
Option A  
9:43 PM  
Identified logical contradiction in user's stated preferences.  
This contradicts your earlier answer.  
You said you want to edit the duplicate. With Option A, every time the original updates, your edits get erased.  
Why would you edit something that gets overwritten?  
Tell me the actual workflow you imagine:

1. What do you do with the duplicate after you copy it?  
2. Why are you duplicating in the first place? Staging? Backup? Migration? Redesign?

I want to duplicate, edit the page, upgrade the original site, then when customer request changes we duuplicate again, edit and upgrade again. We don't want to edit live.  
I there a better way?  
9:45 PM  
Recognized standard staging workflow; identified existing platform solutions.

1.   
2.   
3.   
4.   
*   
*   
*   
*   
*   
*   
*   
* 

Now I understand. This is a staging workflow.

1. Pull live site → staging copy  
2. Edit staging  
3. Push staging → live  
4. Repeat next time

This already exists. You don't need to build it.

* WordPress: WP Engine, Flywheel, Kinsta all have one-click staging built in. Push/pull between live and staging.  
* Shopify: Theme staging via duplicate themes.  
* Webflow: Built-in staging and publish flow.  
* Static/React: Git branches \+ deployment (Netlify, Vercel).

Question: Why are you not using existing staging tools? What's broken about them that makes you want to build your own?  
Nothing, I want to own my own software, lets move forward  
9:46 PM  
Challenged weak business rationale before proceeding further.  
This is a weak reason to build software.  
"I want to own it" is ego, not strategy. You will spend months and thousands building something that exists for $30/month per site.  
Acceptable reasons to build:

* Existing tools are missing critical features you need  
* Cost at scale is prohibitive (100+ sites)  
* You want to productize and sell it  
* Integration with your other internal systems

Unacceptable reason:

* Ownership for its own sake

Direct question: How many client sites do you manage? If it's under 50, building this will cost more than 5 years of paying for existing staging tools.  
Give me the number. Then I'll tell you if building makes financial sense.  
Stop I have made the decision, lets move forward and give me the specs please  
9:46 PM  
Pivoted to execution mode and architected specification framework.

*   
*   
*   
*   
* 

Fair. You've decided.  
Spec: Internal Staging Tool  
---

Purpose: Duplicate client sites to staging environment, edit, push changes to live.  
Platforms (Phase 1):

* WordPress  
* Static HTML

Core Features:

1. Pull: Clone live site to staging (files, database, assets)  
2. Edit: Make changes on staging environment  
3. Push: Deploy staging to live, overwrite live site  
4. History: Keep record of previous deployments

Technical Requirements:

* Server access to client sites (FTP/SFTP or SSH)  
* Database access for WordPress (MySQL credentials)  
* Hosting for staging environments (your infrastructure)  
* URL rewriting (staging URLs must work without breaking links)

Build vs Buy Components:

| Component | Build | Buy/Use |
| ----- | ----- | ----- |
| Site cloning engine | Build | — |
| Staging hosting | — | Your own VPS or cloud |
| Database cloning | Build | — |
| File sync | Build or use rsync | — |
| Admin dashboard | Build | — |

Next step: Do you want a technical architecture diagram, or a task breakdown for developers?  
Give me this concept for internal use, don't explain the business financial sense. need the concept for the team to understand  
9:48 PM  
Crafting straightforward spec document explaining tool functionality.

*   
*   
*   
* 

Want this as a downloadable document or displayed here in chat?  
no  
9:48 PM  
Thinking about interpreting a minimal response.  
What format do you want it in?  
just give me the text  
9:49 PM  
Pivoted to deliver concept text directly inline.  
Internal Staging Tool — Concept Brief  
---

What it does: Creates a private copy of a client's live website. Team edits the copy. When ready, the copy replaces the live site.  
Why we're building it: We don't edit live sites. We duplicate, test changes safely, then publish. This tool centralises that workflow.  
How it works:

1. Select client site from dashboard  
2. System pulls full copy (files, database, images) to our staging server  
3. Team makes edits on staging version  
4. When approved, system pushes staging to live  
5. Old staging is archived

Supported platforms (Phase 1):

* WordPress  
* Static HTML sites

What we need from clients:

* Server credentials (FTP/SFTP or SSH)  
* Database credentials (WordPress only)

What we provide:

* Staging server infrastructure  
* Admin dashboard to manage all client staging sites

Team roles:

* Developers edit staging sites  
* Project managers approve and trigger push to live

---

Architected infrastructure diagram and orchestrated developer task breakdown.

Staging tool architecture  
Diagram · MERMAID   
Staging tool task breakdown  
Document · MD 

##  Staging tool architecture · MERMAID

Copy

flowchart TB  
    subgraph CLIENT\_SITES\["Client Live Sites"\]  
        WP1\["WordPress Site 1"\]  
        WP2\["WordPress Site 2"\]  
        HTML1\["Static HTML Site 1"\]  
        HTML2\["Static HTML Site 2"\]  
    end

    subgraph CONNECTIONS\["Connection Layer"\]  
        FTP\["FTP/SFTP"\]  
        SSH\["SSH"\]  
        DB\_CONN\["MySQL Connection"\]  
    end

    subgraph STAGING\_SERVER\["Staging Server Infrastructure"\]  
        subgraph CORE\_ENGINE\["Core Engine"\]  
            PULL\["Pull Service"\]  
            PUSH\["Push Service"\]  
            SYNC\["File Sync Engine"\]  
            DB\_CLONE\["Database Cloner"\]  
        end  
          
        subgraph STORAGE\["Storage"\]  
            STAGING\_FILES\["Staging Files"\]  
            STAGING\_DB\["Staging Databases"\]  
            ARCHIVE\["Version Archive"\]  
        end  
          
        subgraph DASHBOARD\["Admin Dashboard"\]  
            SITE\_LIST\["Site Manager"\]  
            EDITOR\["Staging Editor Access"\]  
            DEPLOY\["Deploy Controls"\]  
            LOGS\["Activity Logs"\]  
        end  
    end

    subgraph USERS\["Users"\]  
        DEV\["Developers"\]  
        PM\["Project Managers"\]  
    end

    CLIENT\_SITES \--\> CONNECTIONS  
    CONNECTIONS \--\> PULL  
    PULL \--\> SYNC  
    PULL \--\> DB\_CLONE  
    SYNC \--\> STAGING\_FILES  
    DB\_CLONE \--\> STAGING\_DB  
      
    STAGING\_FILES \--\> PUSH  
    STAGING\_DB \--\> PUSH  
    PUSH \--\> CONNECTIONS  
    CONNECTIONS \--\> CLIENT\_SITES  
      
    STAGING\_FILES \--\> ARCHIVE  
    STAGING\_DB \--\> ARCHIVE  
      
    DEV \--\> EDITOR  
    PM \--\> DEPLOY  
    DEPLOY \--\> PUSH  
    SITE\_LIST \--\> PULL

# **Internal Staging Tool — Developer Task Breakdown**

---

## **Phase 1: Infrastructure Setup**

### **1.1 Staging Server**

* Provision cloud server (AWS/DigitalOcean/Linode)  
* Configure web server (Nginx or Apache)  
* Install PHP 8.x for WordPress staging  
* Install MySQL for database staging  
* Set up wildcard SSL for staging subdomains  
* Configure isolated directories per client site

### **1.2 Domain/URL Structure**

* Set up wildcard DNS (\*.staging.yourdomain.com)  
* Map each staging site to unique subdomain (client1.staging.yourdomain.com)

---

## **Phase 2: Core Pull System**

### **2.1 Credential Manager**

* Build secure credential storage (encrypted)  
* Store FTP/SFTP credentials per client  
* Store SSH keys per client  
* Store MySQL credentials per client (WordPress)

### **2.2 File Pull Engine**

* Connect to client server via FTP/SFTP/SSH  
* Download all files recursively  
* Store in client-specific staging directory  
* Handle large file transfers (chunking, resume)  
* Log pull operations

### **2.3 Database Pull Engine (WordPress)**

* Connect to remote MySQL  
* Export full database dump  
* Import to local staging MySQL  
* Search/replace URLs (live URL → staging URL)  
* Handle serialized data in WordPress (use WP-CLI or custom script)

### **2.4 URL Rewriting**

* Replace all hardcoded live URLs with staging URLs in database  
* Replace URLs in static files (HTML, CSS, JS) if present  
* Update wp-config.php with staging database credentials

---

## **Phase 3: Core Push System**

### **3.1 File Push Engine**

* Connect to client server via FTP/SFTP/SSH  
* Upload all staging files to live server  
* Option: full overwrite or differential sync (changed files only)  
* Backup live files before overwrite (store locally)  
* Log push operations

### **3.2 Database Push Engine (WordPress)**

* Export staging database  
* Search/replace URLs (staging URL → live URL)  
* Backup live database before overwrite  
* Import to live MySQL  
* Verify integrity

---

## **Phase 4: Admin Dashboard**

### **4.1 Authentication**

* User login system  
* Role-based access (Developer, Project Manager, Admin)  
* Password reset flow

### **4.2 Site Management**

* Add new client site (name, live URL, credentials)  
* Edit client site details  
* Delete client site and staging data  
* List all client sites with status

### **4.3 Pull Interface**

* "Pull from Live" button per site  
* Progress indicator during pull  
* Success/failure notification  
* Display last pull timestamp

### **4.4 Push Interface**

* "Push to Live" button per site  
* Confirmation modal (prevent accidents)  
* Restrict push to Project Manager and Admin roles  
* Progress indicator during push  
* Success/failure notification  
* Display last push timestamp

### **4.5 Staging Access**

* Link to staging site URL per client  
* Display staging site credentials (if WordPress admin differs)

### **4.6 Activity Logs**

* Log all pull and push actions  
* Log user who triggered action  
* Log timestamp  
* Log success/failure status  
* Display logs in dashboard

---

## **Phase 5: Archive System**

### **5.1 Version Storage**

* Before each push, archive current staging state (files \+ database)  
* Store archives with timestamp  
* Limit archive retention (e.g., last 5 versions per site)

### **5.2 Restore Function**

* List available archives per site  
* Restore staging from selected archive  
* Log restore actions

---

## **Phase 6: Platform-Specific Handling**

### **6.1 WordPress**

* Detect WordPress installation during pull  
* Auto-locate wp-config.php  
* Auto-extract database credentials from wp-config.php  
* Handle multisite (if needed, deprioritise for Phase 1\)

### **6.2 Static HTML**

* Detect non-WordPress site (no wp-config.php)  
* Pull files only (no database)  
* Push files only

---

## **Phase 7: Testing**

* Test pull: WordPress site  
* Test pull: Static HTML site  
* Test push: WordPress site  
* Test push: Static HTML site  
* Test URL rewriting accuracy  
* Test large site handling (1GB+)  
* Test concurrent users on dashboard  
* Test role permissions

---

## **Tech Stack Recommendation (These are no confirmed just suggestions)**

| Component | Technology |
| ----- | ----- |
| Backend | Node.js or Python |
| File Transfer | node-sftp / paramiko (Python) |
| Database Handling | mysql2 (Node) / mysqlclient |
| Dashboard | React or Vue |
| Database | PostgreSQL (app data) |
| Queue (optional) | Redis \+ Bull (for async jobs) |
| Hosting | AWS EC2 / DigitalOcean Droplet/Docker |

